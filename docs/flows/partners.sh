#!/usr/bin/env bash
# Scope §2.2.2 — partner accounts and memberships, admin-provisioned.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
[ -z "$AT" ] && { echo "cannot sign in as admin"; exit 1; }
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)

echo "== partners: list and detail"
expect 'GET /v1/partners' 200 "$BASE/v1/partners?limit=50" -H "authorization: Bearer $AT"
TOTAL=$(field "$WORK/last.json" "['items'].__len__()")
assert 'seeded partners are listed' "$(( TOTAL >= 6 ? 1 : 0 ))" 1

RK=$(authed "$AT" "$BASE/v1/partners?search=Rajesh" | python -c "
import sys,json;items=json.load(sys.stdin)['items'];print(items[0]['id'] if items else '')")
assert 'search by name finds Rajesh' "$([ -n "$RK" ] && echo found || echo missing)" found

authed "$AT" "$BASE/v1/partners?search=MYSBN04" >"$WORK/by-code.json"
assert 'search by project code works' \
  "$(field "$WORK/by-code.json" "['items'].__len__()")" 2

expect 'GET /v1/partners/:id detail' 200 "$BASE/v1/partners/$RK" -H "authorization: Bearer $AT"
assert 'detail carries memberships' \
  "$(field "$WORK/last.json" "['memberships'].__len__()")" 1

echo
echo "== partners: create, duplicate mobile, update"
NEW_MOBILE=$(run_mobile 1)
NEW=$(printf '{"name":"Deepak Rao","mobile":"%s","email":"%s"}' "$NEW_MOBILE" "$(run_email deepak)" | jsonfile new-partner)
expect 'POST /v1/partners creates' 201 -X POST "$BASE/v1/partners" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEW"
DEEPAK=$(field "$WORK/last.json" "['id']")
assert 'initials derived' "$(field "$WORK/last.json" "['initials']")" DR
assert 'no memberships yet so badge is onboarding' \
  "$(field "$WORK/last.json" "['badge']")" onboarding

expect_code 'duplicate mobile rejected' 409 partner_mobile_taken -X POST "$BASE/v1/partners" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEW"

BAD=$(jsonfile bad-mobile <<'JSON'
{"name":"Nobody","mobile":"12345"}
JSON
)
expect_code 'malformed mobile rejected' 400 validation_failed -X POST "$BASE/v1/partners" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$BAD"

PATCHB=$(printf '{"email":"%s"}' "$(run_email deepak-rao)" | jsonfile patch-partner)
expect 'PATCH /v1/partners/:id' 200 -X PATCH "$BASE/v1/partners/$DEEPAK" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$PATCHB"

echo
echo "== memberships: map, duplicate, share basis, exit"
MAP=$(printf '{"projectId":"%s","contributionPaise":"1400000000","shareBasis":"pro_rata_contribution","joinedAt":"2026-09-01"}' "$P4" | jsonfile map-membership)
expect 'POST membership maps partner to project' 201 -X POST "$BASE/v1/partners/$DEEPAK/memberships" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$MAP"
MID=$(field "$WORK/last.json" "['id']")

expect_code 'duplicate membership rejected' 409 membership_exists -X POST "$BASE/v1/partners/$DEEPAK/memberships" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$MAP"

FIXED=$(printf '{"projectId":"%s","contributionPaise":"100000000","shareBasis":"fixed_pct","joinedAt":"2026-09-01"}' "$P6" | jsonfile fixed-no-pct)
expect 'fixed_pct without a percentage is rejected' 400 -X POST "$BASE/v1/partners/$DEEPAK/memberships" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$FIXED"

authed "$AT" "$BASE/v1/partners/$DEEPAK" >"$WORK/deepak.json"
assert 'badge reflects an unsigned agreement' \
  "$(field "$WORK/deepak.json" "['badge']")" sign_pending

echo
echo "== membership drives project scope immediately"
DT=$(partner_token "$NEW_MOBILE")
assert 'new partner sees exactly their mapped project' \
  "$(authed "$DT" "$BASE/v1/projects" | python -c "
import sys,json;print(','.join(p['code'] for p in json.load(sys.stdin)['items']))")" MYSBN04
expect 'and cannot reach a project they are not in' 404 "$BASE/v1/projects/$P6" -H "authorization: Bearer $DT"

EXIT=$(jsonfile exit-membership <<'JSON'
{"status":"exited","exitedAt":"2026-10-01"}
JSON
)
expect 'PATCH membership exits it' 200 -X PATCH "$BASE/v1/partners/$DEEPAK/memberships/$MID" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$EXIT"

# Authorisation is resolved per request, so an exit takes effect on the next
# call rather than at token expiry. The old token must already be powerless.
assert 'an exited membership loses scope on the NEXT request, same token' \
  "$(authed "$DT" "$BASE/v1/projects" | pick "['items'].__len__()")" 0
expect 'exited partner can no longer read the project' 404 "$BASE/v1/projects/$P4" -H "authorization: Bearer $DT"

echo
echo "== co-partner visibility within a shared project"
RT=$(partner_token '+919845022114')
expect 'partner sees co-partners on their own project' 200 "$BASE/v1/projects/$P6/partners" -H "authorization: Bearer $RT"
assert 'three partners on MYSBN06' "$(field "$WORK/last.json" ".__len__()")" 3
expect 'but not on a project they are not in' 404 "$BASE/v1/projects/$P4/partners" -H "authorization: Bearer $RT"

echo
echo "== partner tokens cannot administer"
expect_code 'partner cannot create a partner' 403 forbidden -X POST "$BASE/v1/partners" \
  -H "authorization: Bearer $RT" -H 'content-type: application/json' --data-binary "@$NEW"
expect_code 'partner cannot map a membership' 403 forbidden -X POST "$BASE/v1/partners/$DEEPAK/memberships" \
  -H "authorization: Bearer $RT" -H 'content-type: application/json' --data-binary "@$MAP"

summary 'partners'
