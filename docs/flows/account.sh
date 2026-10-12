#!/usr/bin/env bash
# Scope §2.3 — account deletion (store-mandatory) and own-profile editing,
# plus admin RBAC safety rails.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')
P6=$(project_id "$AT" MYSBN06)

echo "== own profile"
expect 'GET /v1/me' 200 "$BASE/v1/me" -H "authorization: Bearer $PT"
assert 'the caller(s) own name' "$(field "$WORK/last.json" "['name']")" 'Rajesh Kumar'
assert 'and their memberships' "$(field "$WORK/last.json" "['memberships'].__len__()")" 1

RENAME=$(printf '{"name":"Rajesh R Kumar","email":"%s"}' "$(run_email rajesh)" | jsonfile me-patch)
expect 'PATCH /v1/me updates name and email' 200 -X PATCH "$BASE/v1/me" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$RENAME"
assert 'the new name is returned' "$(field "$WORK/last.json" "['name']")" 'Rajesh R Kumar'

# The mobile number is the login identity and is admin-managed, so it must not
# be settable from the partner's own profile.
HIJACK=$(jsonfile me-hijack <<'JSON'
{"mobile":"+919000000001"}
JSON
)
curl -s -o "$WORK/hj.json" -X PATCH "$BASE/v1/me" -H "authorization: Bearer $PT" \
  -H 'content-type: application/json' --data-binary "@$HIJACK"
authed "$PT" -o "$WORK/me2.json" "$BASE/v1/me"
assert 'the login mobile is unchanged' "$(field "$WORK/me2.json" "['mobile']")" '+919845022114'

ROLEGRAB=$(jsonfile me-rolegrab <<'JSON'
{"status":"active","kind":"admin"}
JSON
)
curl -s -o /dev/null -X PATCH "$BASE/v1/me" -H "authorization: Bearer $PT" \
  -H 'content-type: application/json' --data-binary "@$ROLEGRAB"
authed "$PT" -o "$WORK/me3.json" "$BASE/v1/me"
assert 'and a partner cannot promote themselves' "$(field "$WORK/me3.json" "['kind']")" partner

echo
echo "== the deletion policy is disclosed before anything is deleted"
expect 'GET /v1/me/account/deletion-policy' 200 "$BASE/v1/me/account/deletion-policy" \
  -H "authorization: Bearer $PT"
python - <<PY
import json
d = json.load(open(r'$WORK/last.json', encoding='utf-8'))
print('   cleared :', ', '.join(d['cleared'])[:150])
print('   retained:', ', '.join(r['record'] for r in d['retained'])[:150])
PY
assert 'it says what is cleared' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
print('yes' if len(d['cleared'])>0 else 'no')")" yes
# Financial records are statutory and must be named as retained, not quietly kept.
assert 'and names the financial records it retains' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
text=' '.join(r['record'].lower()+' '+r['reason'].lower() for r in d['retained'])
print('yes' if ('ledger' in text or 'statement' in text or 'financial' in text) else 'no')")" yes

echo
echo "== deletion needs an explicit confirmation"
NOCONFIRM=$(jsonfile del-noconfirm <<'JSON'
{"confirm":false}
JSON
)
expect 'confirm:false is refused' 400 -X POST "$BASE/v1/me/account/delete" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$NOCONFIRM"

echo
echo "== deleting a partner anonymises the account and keeps the money"
PRIYA=$(partner_token '+919845022115')
STMT_BEFORE=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from memberships m join users u on u.id=m.user_id where u.mobile='+919845022115';")
assert 'Priya starts with a membership' "$STMT_BEFORE" 1

CONFIRM=$(jsonfile del-ok <<'JSON'
{"confirm":true}
JSON
)
expect 'POST /v1/me/account/delete' 200 -X POST "$BASE/v1/me/account/delete" \
  -H "authorization: Bearer $PRIYA" -H 'content-type: application/json' --data-binary "@$CONFIRM"
python - <<PY
import json
d = json.load(open(r'$WORK/last.json', encoding='utf-8'))
print('   response keys:', ', '.join(sorted(d)))
PY

ROW=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select status || '|' || coalesce(mobile,'null') || '|' || coalesce(email,'null') || '|' || case when password_hash is null then 'null' else 'set' end from users where name='Priya Shetty';")
assert 'the user row is anonymised, not removed' "$ROW" 'deleted|null|null|null'

# The name stays: ledger entries and statements reference it.
NAME=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from users where name='Priya Shetty';")
assert 'the name is retained for the financial record' "$NAME" 1

MEMB=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select m.status from memberships m join users u on u.id=m.user_id where u.name='Priya Shetty';")
assert 'the membership is exited, not deleted' "$MEMB" exited

TOKENS=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from refresh_tokens rt join users u on u.id=rt.user_id where u.name='Priya Shetty' and rt.revoked_at is null;")
assert 'every refresh token is revoked' "$TOKENS" 0

echo
echo "== and the deleted account can no longer be used"
expect_code 'the old access token stops resolving' 401 unauthorized "$BASE/v1/me" -H "authorization: Bearer $PRIYA"
OTPREQ=$(jsonfile del-otp <<'JSON'
{"mobile":"+919845022115"}
JSON
)
# The number is freed for a future account, so a challenge is still issued —
# it just no longer resolves to anyone.
expect 'the freed mobile still issues a challenge' 200 -X POST "$BASE/v1/auth/partner/otp" \
  -H 'content-type: application/json' --data-binary "@$OTPREQ"
CH=$(field "$WORK/last.json" "['challengeId']")
VERIFY=$(printf '{"challengeId":"%s","code":"000000"}' "$CH" | jsonfile del-otpv)
expect 'but it resolves to no account' 403 -X POST "$BASE/v1/auth/partner/otp/verify" \
  -H 'content-type: application/json' --data-binary "@$VERIFY"

echo
echo "== the project no longer counts the deleted partner"
authed "$AT" -o "$WORK/p6.json" "$BASE/v1/projects/$P6"
assert 'three active partners remain on MYSBN06' "$(field "$WORK/p6.json" "['partnerCount']")" 3

echo
echo "== admin RBAC safety rails"
expect 'the permission catalogue is grouped' 200 "$BASE/v1/admin/permissions" -H "authorization: Bearer $AT"
expect 'roles list' 200 "$BASE/v1/admin/roles" -H "authorization: Bearer $AT"
SUPER=$(authed "$AT" "$BASE/v1/admin/roles" | python -c "
import sys,json;d=json.load(sys.stdin)
rows=d['items'] if isinstance(d,dict) and 'items' in d else d
print(next(r['id'] for r in rows if r['key']=='superadmin'))")
RENAMEROLE=$(jsonfile role-rename <<'JSON'
{"name":"Renamed superadmin"}
JSON
)
expect_code 'a system role cannot be changed' 409 role_is_system -X PATCH "$BASE/v1/admin/roles/$SUPER" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$RENAMEROLE"
expect_code 'nor deleted' 409 role_is_system -X DELETE "$BASE/v1/admin/roles/$SUPER" -H "authorization: Bearer $AT"

PARTNERROLE=$(authed "$AT" "$BASE/v1/admin/roles" | python -c "
import sys,json;d=json.load(sys.stdin)
rows=d['items'] if isinstance(d,dict) and 'items' in d else d
print(next(r['id'] for r in rows if r['key']=='partner'))")
expect_code 'a role still assigned cannot be deleted' 409 role_is_system -X DELETE "$BASE/v1/admin/roles/$PARTNERROLE" \
  -H "authorization: Bearer $AT"

echo
echo "== the last superadmin cannot lock everyone out"
ADMINID=$(authed "$AT" "$BASE/v1/auth/me" | pick "['id']")
expect_code 'they cannot delete themselves' 409 last_superadmin -X DELETE "$BASE/v1/admin/users/$ADMINID" \
  -H "authorization: Bearer $AT"
SUSPEND=$(jsonfile admin-suspend <<'JSON'
{"status":"suspended"}
JSON
)
expect_code 'nor suspend themselves' 409 last_superadmin -X PATCH "$BASE/v1/admin/users/$ADMINID" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$SUSPEND"
DEMOTE=$(jsonfile admin-demote <<'JSON'
{"roleKeys":["operations"]}
JSON
)
expect_code 'nor demote themselves' 409 last_superadmin -X POST "$BASE/v1/admin/users/$ADMINID/roles" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$DEMOTE"

echo
echo "== creating a second admin, and a duplicate email"
NEWADMIN=$(printf '{"name":"Ops User","email":"%s","password":"a-long-enough-pass","roleKeys":["operations"]}' "$(run_email ops)" | jsonfile new-admin)
expect 'create an operations admin' 201 -X POST "$BASE/v1/admin/users" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEWADMIN"
expect_code 'a duplicate email is refused' 409 email_taken -X POST "$BASE/v1/admin/users" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEWADMIN"

SHORT=$(printf '{"name":"Weak","email":"%s","password":"short","roleKeys":["operations"]}' "$(run_email weak)" | jsonfile weak-admin)
expect 'a short admin password is refused' 400 -X POST "$BASE/v1/admin/users" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$SHORT"

echo
echo "== two-factor enrolment is not complete until a code round-trips"
expect 'enrol starts and returns a secret' 200 -X POST "$BASE/v1/me/2fa/enrol" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
assert 'with an otpauth url to paste into an authenticator' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
print('yes' if str(d.get('otpauthUrl','')).startswith('otpauth://') else 'no')")" yes
ENABLED=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select case when totp_enabled_at is null then 'not-yet' else 'enabled' end from users where email='admin@cofarm.local';")
assert 'but it is not active until confirmed' "$ENABLED" not-yet
BADCODE=$(jsonfile totp-bad <<'JSON'
{"code":"000000"}
JSON
)
expect_code 'a wrong code does not enable it' 400 two_factor_invalid -X POST "$BASE/v1/me/2fa/confirm" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$BADCODE"

summary 'account'
