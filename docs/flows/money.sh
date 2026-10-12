#!/usr/bin/env bash
# Scope §2.2.4 (expense entry), §2.2.5 (harvest entry) and §2.1.4 (harvest &
# P&L) — including the client's signed-off share split, checked arithmetically.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')      # Rajesh, 18L on MYSBN06
OTHER=$(partner_token '+919845022117')   # Amit, on MYSBN04
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)
CYC=$(authed "$AT" "$BASE/v1/projects/$P6/cycles" | pick "[0]['id']")

post() { # post <path> <bodyfile> [extra curl args...]
  local path=$1 body=$2
  shift 2
  curl -s -o "$WORK/last.json" -w '%{http_code}' -X POST "$BASE$path" \
    -H "authorization: Bearer $AT" -H 'content-type: application/json' \
    --data-binary "@$body" "$@"
}

echo "== expenses: record the four cost heads from the approved P&L"
# The client's worked example: lease 2,40,000 / saplings 3,10,600 /
# manure 2,18,400 / labour 2,05,200 = 9,74,200 total.
for pair in "lease_land:24000000" "saplings_infra:31060000" "manure_nutrition:21840000" "labour_maintenance:20520000"; do
  head=${pair%%:*}; amount=${pair#*:}
  body=$(printf '{"cycleId":"%s","costHead":"%s","amountPaise":"%s","entryDate":"2026-07-15","note":"%s for cycle 1"}' \
    "$CYC" "$head" "$amount" "$head" | jsonfile "exp-$head")
  expect "record $head" 201 -X POST "$BASE/v1/projects/$P6/expenses" \
    -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$body"
done

authed "$AT" -o "$WORK/sum1.json" "$BASE/v1/projects/$P6/ledger/summary?cycleId=$CYC"
assert 'total cost matches the worked example' \
  "$(field "$WORK/sum1.json" "['totalCostPaise']")" 97420000

FUTURE=$(printf '{"cycleId":"%s","costHead":"misc","amountPaise":"10000","entryDate":"2099-01-01"}' "$CYC" | jsonfile exp-future)
expect 'a future entry date is refused' 400 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$FUTURE"

ZERO=$(printf '{"cycleId":"%s","costHead":"misc","amountPaise":"0","entryDate":"2026-07-15"}' "$CYC" | jsonfile exp-zero)
expect 'a zero amount is refused' 400 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$ZERO"

echo
echo "== the ledger is append-only: a mistake is reversed, never edited"
MISTAKE=$(printf '{"cycleId":"%s","costHead":"misc","amountPaise":"5000000","entryDate":"2026-07-20","note":"Keyed twice by mistake"}' "$CYC" | jsonfile exp-mistake)
expect 'record an entry that will be reversed' 201 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$MISTAKE"
BAD=$(field "$WORK/last.json" "['id']")

authed "$AT" -o "$WORK/sum2.json" "$BASE/v1/projects/$P6/ledger/summary?cycleId=$CYC"
assert 'the mistake is in the total while it stands' \
  "$(field "$WORK/sum2.json" "['totalCostPaise']")" 102420000

REASON=$(jsonfile exp-reverse <<'JSON'
{"note":"Duplicate of the 20 July entry"}
JSON
)
expect 'reverse it' 201 -X POST "$BASE/v1/projects/$P6/expenses/$BAD/reverse" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$REASON"
expect_code 'reversing the same entry twice is refused' 409 ledger_immutable \
  -X POST "$BASE/v1/projects/$P6/expenses/$BAD/reverse" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$REASON"

authed "$AT" -o "$WORK/sum3.json" "$BASE/v1/projects/$P6/ledger/summary?cycleId=$CYC"
# Both halves of a cancelled pair must drop out, not just the reversal.
assert 'and the total returns to the worked example' \
  "$(field "$WORK/sum3.json" "['totalCostPaise']")" 97420000

authed "$AT" -o "$WORK/explist.json" "$BASE/v1/projects/$P6/expenses?cycleId=$CYC&limit=50"
assert 'yet both rows remain visible as an audit trail' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/explist.json',encoding='utf-8'))
print(sum(1 for i in d['items'] if i['costHead']=='misc'))")" 2

echo
echo "== no edit and no delete exist on a ledger entry"
expect 'PATCH an expense is not a route' 404 -X PATCH "$BASE/v1/projects/$P6/expenses/$BAD" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$REASON"
expect 'DELETE an expense is not a route' 404 -X DELETE "$BASE/v1/projects/$P6/expenses/$BAD" \
  -H "authorization: Bearer $AT"

echo
echo "== contributions and revenue"
MID=$(authed "$AT" "$BASE/v1/projects/$P6/partners" | python -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name'].startswith('Rajesh'): print(p['membershipId']); break")
CONTRIB=$(printf '{"membershipId":"%s","amountPaise":"180000000","entryDate":"2026-02-20","note":"Full contribution"}' "$MID" | jsonfile contrib)
expect 'record a contribution' 201 -X POST "$BASE/v1/projects/$P6/contributions" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$CONTRIB"
authed "$AT" -o "$WORK/sum4.json" "$BASE/v1/projects/$P6/ledger/summary"
assert 'contributions are tracked at project level' \
  "$(field "$WORK/sum4.json" "['contributionsPaise']")" 180000000

echo
echo "== tenancy on the money"
expect 'partner reads their own ledger summary' 200 "$BASE/v1/projects/$P6/ledger/summary" -H "authorization: Bearer $PT"
expect_code 'but not a project they are not in' 404 not_found "$BASE/v1/projects/$P6/ledger/summary" -H "authorization: Bearer $OTHER"
expect_code 'a partner cannot record an expense' 403 forbidden -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$MISTAKE"

echo
echo "== harvest: the draft, and the computed gross"
# 68,400 kg at 27.20/kg = 18,60,480 — the client's Cycle 2 example.
HARV=$(printf '{"cycleId":"%s","yieldKg":"68400.00","varietySplit":{"Yelakki":"28100.00","G9":"40300.00"},"pricePerKgPaise":"2720","buyer":"Sri Balaji Traders, Mysore","harvestedOn":"2026-09-20"}' "$CYC" | jsonfile harv)
expect 'create the harvest draft' 201 -X POST "$BASE/v1/projects/$P6/harvest" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$HARV"
HID=$(field "$WORK/last.json" "['id']")
assert 'gross revenue is computed by the server, not supplied' \
  "$(field "$WORK/last.json" "['grossRevenuePaise']")" 186048000
assert 'and it starts as a draft' "$(field "$WORK/last.json" "['status']")" draft

MISMATCH=$(printf '{"cycleId":"%s","yieldKg":"100.00","varietySplit":{"Yelakki":"40.00","G9":"50.00"},"pricePerKgPaise":"2720","buyer":"X","harvestedOn":"2026-09-20"}' "$CYC" | jsonfile harv-mismatch)
expect 'a variety split that does not sum to the yield is refused' 400 -X POST "$BASE/v1/projects/$P6/harvest" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$MISMATCH"
expect_code 'a second harvest on the same cycle is refused' 409 harvest_exists -X POST "$BASE/v1/projects/$P6/harvest" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$HARV"

echo
echo "== the P&L preview reproduces the client's signed-off split"
authed "$AT" -o "$WORK/prev.json" "$BASE/v1/projects/$P6/harvest/$HID/preview"
assert 'gross' "$(field "$WORK/prev.json" "['grossRevenuePaise']")" 186048000
assert 'total cost' "$(field "$WORK/prev.json" "['totalCostPaise']")" 97420000
assert 'net proceeds = 8,86,280' "$(field "$WORK/prev.json" "['netProceedsPaise']")" 88628000
assert 'Kiaan 50%' "$(field "$WORK/prev.json" "['kiaanSharePaise']")" 44314000
assert 'partner pool 50%' "$(field "$WORK/prev.json" "['partnerPoolPaise']")" 44314000

python - <<PY
import json
prev = json.load(open(r'$WORK/prev.json', encoding='utf-8'))
shares = {s['name'].split()[0]: s['sharePaise'] for s in prev['partners']}
print('   shares:', {k: v for k, v in sorted(shares.items())})
PY
assert 'Rajesh (18L of 39L) gets 2,04,526.15' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/prev.json',encoding='utf-8'))
print(next(s['sharePaise'] for s in d['partners'] if s['name'].startswith('Rajesh')))")" 20452615
assert 'Priya (12L) gets 1,36,350.77' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/prev.json',encoding='utf-8'))
print(next(s['sharePaise'] for s in d['partners'] if s['name'].startswith('Priya')))")" 13635077
assert 'Venkat (9L) gets 1,02,263.08' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/prev.json',encoding='utf-8'))
print(next(s['sharePaise'] for s in d['partners'] if s['name'].startswith('Venkat')))")" 10226308
# Largest-remainder rounding exists so this holds to the paise, every time.
assert 'the shares sum to the pool exactly' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/prev.json',encoding='utf-8'))
print(sum(int(s['sharePaise']) for s in d['partners']))")" 44314000

echo
echo "== publishing a harvest is irreversible and notifies every partner"
NBEFORE=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='harvest_published';")
PKEY=$(idem harv)
expect 'publish' 200 -X POST "$BASE/v1/projects/$P6/harvest/$HID/publish" \
  -H "authorization: Bearer $AT" -H "idempotency-key: $PKEY" -H 'content-length: 0'
NAFTER=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='harvest_published';")
assert 'all three partners were notified' "$NAFTER" "$((NBEFORE + 3))"

STMTS=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from partner_statements where cycle_id='$CYC';")
assert 'one statement snapshotted per active partner' "$STMTS" 3
assert 'and the stored shares also sum to the pool' \
  "$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
    "select sum(share_paise) from partner_statements where cycle_id='$CYC';")" 44314000

expect_code 'publishing twice is refused' 409 harvest_already_published \
  -X POST "$BASE/v1/projects/$P6/harvest/$HID/publish" -H "authorization: Bearer $AT" \
  -H "idempotency-key: $(idem harv2)" -H 'content-length: 0'
EDIT=$(printf '{"buyer":"Someone else"}' | jsonfile harv-edit)
expect_code 'a published harvest has no edit path' 409 harvest_already_published \
  -X PATCH "$BASE/v1/projects/$P6/harvest/$HID" -H "authorization: Bearer $AT" \
  -H 'content-type: application/json' --data-binary "@$EDIT"

echo
echo "== revenue reached the ledger, so the figures still reconcile"
authed "$AT" -o "$WORK/sum5.json" "$BASE/v1/projects/$P6/ledger/summary?cycleId=$CYC"
assert 'gross revenue is now on the ledger' \
  "$(field "$WORK/sum5.json" "['grossRevenuePaise']")" 186048000
assert 'net on the ledger matches the statement' \
  "$(field "$WORK/sum5.json" "['netProceedsPaise']")" 88628000

echo
echo "== the partner sees their own statement and nobody else's"
authed "$PT" -o "$WORK/stmt.json" "$BASE/v1/projects/$P6/cycles/$CYC/statement"
assert 'their share' "$(field "$WORK/stmt.json" "['sharePaise']")" 20452615
assert 'their contribution' "$(field "$WORK/stmt.json" "['contributionPaise']")" 180000000
assert 'the pool is shown for context' "$(field "$WORK/stmt.json" "['partnerPoolPaise']")" 44314000
expect_code 'a partner from another project gets nothing' 404 not_found \
  "$BASE/v1/projects/$P6/cycles/$CYC/statement" -H "authorization: Bearer $OTHER"

echo
echo "== the statement renders as a PDF"
PDFCODE=$(curl -s -o "$WORK/stmt.pdf" -w '%{http_code}' \
  "$BASE/v1/projects/$P6/cycles/$CYC/statement.pdf" -H "authorization: Bearer $PT")
assert 'the pdf endpoint answers' "$PDFCODE" 200
assert 'and it really is a pdf' "$(head -c 4 "$WORK/stmt.pdf")" '%PDF'

echo
echo "== cumulative totals across projects"
authed "$PT" -o "$WORK/mine.json" "$BASE/v1/me/statements"
assert 'one statement so far' "$(field "$WORK/mine.json" "['items'].__len__()")" 1
assert 'total earned equals this cycle(s) share' \
  "$(field "$WORK/mine.json" "['totals']['totalEarnedPaise']")" 20452615

echo
echo "== payouts are recorded once"
PAY=$(jsonfile payouts <<'JSON'
{"entryDate":"2026-10-02","note":"Cycle 1 profit share"}
JSON
)
expect 'record the payouts' 200 -X POST "$BASE/v1/projects/$P6/harvest/$HID/payouts" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem pay)" --data-binary "@$PAY"
# A fresh key would otherwise double-pay, so the ledger itself must refuse.
expect_code 'a second payout run with a new key is refused' 409 payouts_already_recorded \
  -X POST "$BASE/v1/projects/$P6/harvest/$HID/payouts" -H "authorization: Bearer $AT" \
  -H 'content-type: application/json' -H "idempotency-key: $(idem pay2)" --data-binary "@$PAY"

summary 'money'
