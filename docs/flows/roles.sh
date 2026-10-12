#!/usr/bin/env bash
# Scope §2.2.8 and §2.3 — role-based access control held as data. Every other
# section signs in as the superadmin or a partner, so this is the one that
# proves the middle: that a role grants exactly its permissions, that a role
# composed through the console takes effect, and that revoking it takes effect
# on the next request.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
P6=$(project_id "$AT" MYSBN06)
PASSWORD='a-long-enough-pass'

new_admin() { # new_admin <label> <roleKey>  -> email
  local email
  email=$(run_email "$1")
  local body
  body=$(printf '{"name":"%s","email":"%s","password":"%s","roleKeys":["%s"]}' \
    "$1" "$email" "$PASSWORD" "$2" | jsonfile "admin-$1")
  curl -s -o /dev/null -X POST "$BASE/v1/admin/users" -H "authorization: Bearer $AT" \
    -H 'content-type: application/json' --data-binary "@$body"
  printf '%s' "$email"
}

echo "== the seeded system roles are distinct, not aliases of superadmin"
authed "$AT" -o "$WORK/roles.json" "$BASE/v1/admin/roles"
perms() { # perms <roleKey> -> count
  python -c "
import json, sys
data = json.load(open(sys.argv[1], encoding='utf-8'))
rows = data['items'] if isinstance(data, dict) and 'items' in data else data
role = next(r for r in rows if r['key'] == sys.argv[2])
print(len(role['permissions']))" "$WORK/roles.json" "$1"
}
assert 'superadmin holds every permission' "$(perms superadmin)" 29
assert 'partner holds none' "$(perms partner)" 0
assert 'operations holds a content-shaped subset' "$(perms operations)" 17
assert 'finance holds a money-shaped subset' "$(perms finance)" 9

echo
echo "== an operations admin runs content, and is refused the money"
OPS_EMAIL=$(new_admin ops operations)
OPS=$(as_admin "$OPS_EMAIL" "$PASSWORD")
assert 'operations signs in' "$([ -n "$OPS" ] && echo yes || echo no)" yes

expect 'reads projects' 200 "$BASE/v1/projects" -H "authorization: Bearer $OPS"
expect 'reads partners' 200 "$BASE/v1/partners" -H "authorization: Bearer $OPS"
expect 'reads the update history' 200 "$BASE/v1/projects/$P6/updates" -H "authorization: Bearer $OPS"

OPSUPD=$(jsonfile ops-update <<'JSON'
{"milestoneTag":"growth","title":"Posted by operations","description":"Operations owns the daily updates.","activityDate":"2026-09-29"}
JSON
)
expect 'posts an update' 201 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $OPS" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem opsupd)" --data-binary "@$OPSUPD"
OPSUPDID=$(field "$WORK/last.json" "['id']")
expect 'and publishes it' 200 -X POST "$BASE/v1/projects/$P6/updates/$OPSUPDID/publish" \
  -H "authorization: Bearer $OPS" -H "idempotency-key: $(idem opspub)" -H 'content-length: 0'

# Costs and statements are the finance role's, so operations is refused them
# even though it may post about the same project all day.
OPSEXP=$(jsonfile ops-expense <<'JSON'
{"costHead":"misc","amountPaise":"500000","entryDate":"2026-09-01","note":"Not operations to record"}
JSON
)
expect_code 'cannot record an expense' 403 forbidden -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $OPS" -H 'content-type: application/json' --data-binary "@$OPSEXP"
expect_code 'cannot read the expense ledger' 403 forbidden "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $OPS"
expect_code 'cannot administer admin users' 403 forbidden "$BASE/v1/admin/users" \
  -H "authorization: Bearer $OPS"
expect_code 'cannot administer roles' 403 forbidden "$BASE/v1/admin/roles" \
  -H "authorization: Bearer $OPS"
expect_code 'cannot inspect the job queue' 403 forbidden "$BASE/v1/admin/jobs" \
  -H "authorization: Bearer $OPS"

echo
echo "== a finance admin runs the money, and is refused the content"
FIN_EMAIL=$(new_admin fin finance)
FIN=$(as_admin "$FIN_EMAIL" "$PASSWORD")
assert 'finance signs in' "$([ -n "$FIN" ] && echo yes || echo no)" yes

FINEXP=$(jsonfile fin-expense <<'JSON'
{"costHead":"labour_maintenance","amountPaise":"4500000","entryDate":"2026-09-02","note":"Recorded by finance"}
JSON
)
expect 'records an expense' 201 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $FIN" -H 'content-type: application/json' --data-binary "@$FINEXP"
expect 'reads the expense ledger' 200 "$BASE/v1/projects/$P6/expenses" -H "authorization: Bearer $FIN"
expect 'reads the ledger summary' 200 "$BASE/v1/projects/$P6/ledger/summary" \
  -H "authorization: Bearer $FIN"

FINUPD=$(jsonfile fin-update <<'JSON'
{"milestoneTag":"growth","title":"Not finance to post","description":"Content belongs to operations.","activityDate":"2026-09-29"}
JSON
)
expect_code 'cannot post an update' 403 forbidden -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $FIN" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem finupd)" --data-binary "@$FINUPD"
expect_code 'cannot publish the update operations wrote' 403 forbidden \
  -X POST "$BASE/v1/projects/$P6/updates/$OPSUPDID/publish" -H "authorization: Bearer $FIN" \
  -H "idempotency-key: $(idem finpub)" -H 'content-length: 0'
DRAFT=$(jsonfile roles-mis-draft <<'JSON'
{"month":5,"year":2026,"title":"May 2026","source":"generated","narrative":"Still internal."}
JSON
)
curl -s -o /dev/null -X POST "$BASE/v1/projects/$P6/mis" -H "authorization: Bearer $AT" \
  -H 'content-type: application/json' -H "idempotency-key: $(idem rolesdraft)" \
  --data-binary "@$DRAFT"

drafts() { # drafts <token> -> count of draft rows visible
  authed "$1" "$BASE/v1/projects/$P6/mis" | python -c "
import sys, json
print(sum(1 for r in json.load(sys.stdin)['items'] if r['status'] == 'draft'))"
}

# Reading published reports needs no permission: a partner holds none and must
# still see their own. mis.read is what admits the drafts.
expect 'reads the published archive like any member' 200 "$BASE/v1/projects/$P6/mis" \
  -H "authorization: Bearer $FIN"
assert 'but sees no drafts, holding no mis.read' "$(drafts "$FIN")" 0
assert 'while operations does' "$(drafts "$OPS")" 1
expect_code 'cannot reach the partner inbox' 403 forbidden "$BASE/v1/threads" \
  -H "authorization: Bearer $FIN"
expect_code 'cannot chase read receipts' 403 forbidden \
  "$BASE/v1/tracking/receipts?projectId=$P6&entityType=project_update&entityId=$OPSUPDID" \
  -H "authorization: Bearer $FIN"

echo
echo "== §2.3 a role is data: the superadmin composes one and it grants exactly that"
CUSTOM_KEY="cost-clerk-$RUN_ID"
NEWROLE=$(printf '{"key":"%s","name":"Cost clerk","permissions":["project.read","expense.read"]}' \
  "$CUSTOM_KEY" | jsonfile new-role)
expect 'create a role through the console' 201 -X POST "$BASE/v1/admin/roles" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEWROLE"
ROLEID=$(field "$WORK/last.json" "['id']")

CLERK_EMAIL=$(new_admin clerk "$CUSTOM_KEY")
CLERK=$(as_admin "$CLERK_EMAIL" "$PASSWORD")
expect 'the holder reads the ledger it was granted' 200 "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $CLERK"
expect_code 'and nothing it was not' 403 forbidden -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $CLERK" -H 'content-type: application/json' --data-binary "@$FINEXP"
assert 'nor the internal drafts' "$(drafts "$CLERK")" 0

echo
echo "== widening and narrowing a role takes effect on the next request"
WIDEN=$(jsonfile widen-role <<'JSON'
{"permissions":["project.read","expense.read","expense.write"]}
JSON
)
expect 'grant the role one more permission' 200 -X PATCH "$BASE/v1/admin/roles/$ROLEID" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$WIDEN"
# Permissions are read from the role on every request, so the holder does not
# sign in again to pick up the change.
expect 'the same token may now record one' 201 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $CLERK" -H 'content-type: application/json' --data-binary "@$FINEXP"

NARROW=$(jsonfile narrow-role <<'JSON'
{"permissions":["project.read"]}
JSON
)
expect 'take the ledger back off the role' 200 -X PATCH "$BASE/v1/admin/roles/$ROLEID" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NARROW"
expect_code 'and the same token loses it immediately' 403 forbidden "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $CLERK"

echo
echo "== a role still assigned cannot be deleted out from under its holder"
expect_code 'delete is refused while assigned' 409 role_in_use -X DELETE "$BASE/v1/admin/roles/$ROLEID" \
  -H "authorization: Bearer $AT"

echo
echo "== an unknown permission key is refused, so a role cannot grant nonsense"
BOGUS=$(printf '{"key":"bogus-%s","name":"Bogus","permissions":["expense.everything"]}' "$RUN_ID" \
  | jsonfile bogus-role)
expect_code 'unknown permission key' 400 validation_failed -X POST "$BASE/v1/admin/roles" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$BOGUS"

echo
echo "== a suspended admin cannot act, whatever their role"
SUSPEND=$(jsonfile suspend-clerk <<'JSON'
{"status":"suspended"}
JSON
)
CLERKID=$(authed "$AT" "$BASE/v1/admin/users?search=clerk" | python -c "
import sys, json
rows = json.load(sys.stdin)['items']
print(next(r['id'] for r in rows if r['email'].startswith('clerk-')))")
expect 'suspend them' 200 -X PATCH "$BASE/v1/admin/users/$CLERKID" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$SUSPEND"
expect_code 'their token stops resolving' 401 unauthorized "$BASE/v1/projects" \
  -H "authorization: Bearer $CLERK"
expect_code 'and they cannot sign in again' 401 credentials_invalid -X POST "$BASE/v1/auth/admin/login" \
  -H 'content-type: application/json' \
  --data-binary "@$(printf '{"email":"%s","password":"%s"}' "$CLERK_EMAIL" "$PASSWORD" | jsonfile clerk-login)"

summary 'roles'
