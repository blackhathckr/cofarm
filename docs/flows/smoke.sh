#!/usr/bin/env bash
# Scope §2.3 (authentication, RBAC) and §2.2.1 (projects and cycles).
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

echo "== health and error shape"
expect 'GET /health/live' 200 "$BASE/health/live"
expect 'GET /health/ready' 200 "$BASE/health/ready"
expect_code 'unknown route is problem+json' 404 not_found "$BASE/nope"

echo
echo "== admin sign-in"
WRONG=$(jsonfile wrong-pass <<'JSON'
{"email":"admin@cofarm.local","password":"wrongwrong"}
JSON
)
expect_code 'wrong password' 401 credentials_invalid -X POST "$BASE/v1/auth/admin/login" \
  -H 'content-type: application/json' --data-binary "@$WRONG"

UNKNOWN=$(jsonfile unknown-admin <<'JSON'
{"email":"nobody@cofarm.local","password":"whatever12"}
JSON
)
expect_code 'unknown email is indistinguishable' 401 credentials_invalid -X POST "$BASE/v1/auth/admin/login" \
  -H 'content-type: application/json' --data-binary "@$UNKNOWN"

LOGIN=$(jsonfile admin-ok <<'JSON'
{"email":"admin@cofarm.local","password":"cofarm-dev-admin"}
JSON
)
expect 'correct credentials' 200 -X POST "$BASE/v1/auth/admin/login" \
  -H 'content-type: application/json' --data-binary "@$LOGIN"
AT=$(field "$WORK/last.json" "['accessToken']")
RT_TOKEN=$(field "$WORK/last.json" "['refreshToken']")
assert 'superadmin holds every permission' \
  "$(field "$WORK/last.json" "['user']['permissions'].__len__()")" 29

echo
echo "== partner OTP sign-in"
M=+919845022114
OTPREQ=$(printf '{"mobile":"%s"}' "$M" | jsonfile otp-req)
expect 'OTP requested' 200 -X POST "$BASE/v1/auth/partner/otp" \
  -H 'content-type: application/json' --data-binary "@$OTPREQ"
CH=$(field "$WORK/last.json" "['challengeId']")
assert 'dev provider echoes the code so local work needs no SMS' \
  "$(field "$WORK/last.json" "['devCode']")" 000000

BADSHAPE=$(jsonfile otp-badshape <<'JSON'
{"mobile":"12345"}
JSON
)
expect_code 'malformed mobile' 400 validation_failed -X POST "$BASE/v1/auth/partner/otp" \
  -H 'content-type: application/json' --data-binary "@$BADSHAPE"

# An unknown number still gets a challenge: telling the caller which numbers
# are registered would turn the login screen into a partner directory.
UNREG=$(jsonfile otp-unreg <<'JSON'
{"mobile":"+919999999999"}
JSON
)
expect 'unknown mobile still issues a challenge' 200 -X POST "$BASE/v1/auth/partner/otp" \
  -H 'content-type: application/json' --data-binary "@$UNREG"

WRONGCODE=$(printf '{"challengeId":"%s","code":"123456"}' "$CH" | jsonfile otp-wrong)
expect_code 'wrong code' 401 otp_invalid -X POST "$BASE/v1/auth/partner/otp/verify" \
  -H 'content-type: application/json' --data-binary "@$WRONGCODE"

GOODCODE=$(printf '{"challengeId":"%s","code":"000000"}' "$CH" | jsonfile otp-good)
expect 'correct code signs in' 200 -X POST "$BASE/v1/auth/partner/otp/verify" \
  -H 'content-type: application/json' --data-binary "@$GOODCODE"
PT=$(field "$WORK/last.json" "['accessToken']")
assert 'signed in as the mapped partner' "$(field "$WORK/last.json" "['user']['name']")" 'Rajesh Kumar'
assert 'partner holds no console permissions' \
  "$(field "$WORK/last.json" "['user']['permissions'].__len__()")" 0

expect_code 'a consumed challenge cannot be replayed' 401 otp_invalid -X POST "$BASE/v1/auth/partner/otp/verify" \
  -H 'content-type: application/json' --data-binary "@$GOODCODE"

echo
echo "== tokens"
expect 'GET /v1/auth/me' 200 "$BASE/v1/auth/me" -H "authorization: Bearer $AT"
expect_code 'no token' 401 unauthorized "$BASE/v1/auth/me"
expect_code 'malformed token' 401 unauthorized "$BASE/v1/auth/me" -H 'authorization: Bearer not-a-jwt'

REFRESH=$(printf '{"refreshToken":"%s"}' "$RT_TOKEN" | jsonfile refresh)
expect 'refresh rotates the session' 200 -X POST "$BASE/v1/auth/refresh" \
  -H 'content-type: application/json' --data-binary "@$REFRESH"
# Rotated on use, so a stolen refresh token is good for exactly one call.
expect_code 'the old refresh token is dead' 401 unauthorized -X POST "$BASE/v1/auth/refresh" \
  -H 'content-type: application/json' --data-binary "@$REFRESH"

echo
echo "== project scope is the tenant boundary"
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)
assert 'admin sees every project' "$(authed "$AT" "$BASE/v1/projects" | pick "['items'].__len__()")" 3
assert 'partner sees only their own' \
  "$(authed "$PT" "$BASE/v1/projects" | python -c "
import sys,json;print(','.join(p['code'] for p in json.load(sys.stdin)['items']))")" MYSBN06

expect 'partner reads their own project' 200 "$BASE/v1/projects/$P6" -H "authorization: Bearer $PT"
# 404 rather than 403: a 403 would confirm the project exists.
expect_code 'a foreign project is not found, not forbidden' 404 not_found "$BASE/v1/projects/$P4" -H "authorization: Bearer $PT"
expect_code 'nor are its cycles' 404 not_found "$BASE/v1/projects/$P4/cycles" -H "authorization: Bearer $PT"
expect_code 'partner cannot edit their own project' 403 forbidden -X PATCH "$BASE/v1/projects/$P6" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$(jsonfile rename <<<'{"name":"Hacked"}')"

# Guards run on preValidation, so an unauthorised caller never learns the schema.
ROGUE=$(jsonfile rogue-project <<'JSON'
{"code":"MYSBN99","name":"Rogue Block","location":"Nowhere","acreageAcres":10,"variety":"Yelakki","startDate":"2026-01-01"}
JSON
)
expect_code 'partner POST project, valid body' 403 forbidden -X POST "$BASE/v1/projects" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$ROGUE"
expect_code 'partner POST project, invalid body is still 403' 403 forbidden -X POST "$BASE/v1/projects" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$(jsonfile junk <<<'{"code":"x"}')"

echo
echo "== projects and cycles"
CODE="MYS$(printf 'BN%02d' $((RUN_ID % 90 + 10)))"
NEWP=$(printf '{"code":"%s","name":"Smoke Block","location":"Mysore","acreageAcres":10,"variety":"Yelakki","startDate":"2026-10-01","capacityPaise":"4000000000"}' "$CODE" | jsonfile new-project)
expect 'admin creates a project' 201 -X POST "$BASE/v1/projects" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEWP"
NID=$(field "$WORK/last.json" "['id']")
assert 'a new project opens with no cycle' "$(field "$WORK/last.json" "['currentCycle']")" None

expect_code 'duplicate code' 409 project_code_taken -X POST "$BASE/v1/projects" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$NEWP"
expect_code 'malformed project code' 400 validation_failed -X POST "$BASE/v1/projects" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$(jsonfile badcode <<<'{"code":"nope","name":"Bad","location":"Mysore","acreageAcres":10,"variety":"Yelakki","startDate":"2026-10-01"}')"

expect 'open cycle 1' 201 -X POST "$BASE/v1/projects/$NID/cycles" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$(jsonfile cyc <<<'{"startDate":"2026-10-15","expectedHarvestFrom":"2027-10-01","expectedHarvestTo":"2027-11-30"}')"
CYC=$(field "$WORK/last.json" "['id']")
assert 'the milestone sequence is laid out up front' \
  "$(field "$WORK/last.json" "['milestones'].__len__()")" 5
assert 'and the first stage is already active' \
  "$(field "$WORK/last.json" "['milestones'][0]['status']")" active

echo
echo "== milestone progress is weighted, not evenly divided"
curl -s -o /dev/null -X PATCH "$BASE/v1/projects/$NID/cycles/$CYC/milestone" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  --data-binary "@$(jsonfile ms1 <<<'{"stage":"land_prep","status":"done"}')"
authed "$AT" -X PATCH "$BASE/v1/projects/$NID/cycles/$CYC/milestone" \
  -H 'content-type: application/json' \
  --data-binary "@$(jsonfile ms2 <<<'{"stage":"planting","status":"active"}')" >"$WORK/ms.json"
# land_prep weighs 8 and planting 7; a done stage counts in full and an active
# one counts half, so 8 + 3.5 of 100 = 1150 bps.
assert 'land_prep done + planting active = 1150 bps' "$(field "$WORK/ms.json" "['progressBps']")" 1150

summary 'smoke'
