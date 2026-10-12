#!/usr/bin/env bash
# Scope §2.1.2 / §2.2.6 (project updates, backfill, notify control) and
# §2.1.3 / §2.2.3 (MIS reports, publish, read receipts).
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')      # Rajesh, MYSBN06
OTHER=$(partner_token '+919845022117')   # Amit, MYSBN04
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)

upload_pdf() { # upload_pdf <projectId> <type> -> documentId
  local project=$1 kind=$2 size req doc url
  printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' >"$WORK/doc.pdf"
  size=$(wc -c <"$WORK/doc.pdf" | tr -d ' ')
  req=$(printf '{"projectId":"%s","type":"%s","originalName":"r.pdf","mime":"application/pdf","sizeBytes":%s}' "$project" "$kind" "$size" | jsonfile up-req)
  curl -s -o "$WORK/up.json" -X POST "$BASE/v1/documents/upload-url" \
    -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$req"
  doc=$(field "$WORK/up.json" "['documentId']")
  url=$(field "$WORK/up.json" "['uploadUrl']")
  curl -s -o /dev/null -X PUT "$url" -H 'content-type: application/pdf' --data-binary "@$WORK/doc.pdf"
  curl -s -o /dev/null -X POST "$BASE/v1/documents/$doc/confirm" \
    -H "authorization: Bearer $AT" -H 'content-length: 0'
  printf '%s' "$doc"
}

echo "== updates: backfill a running project's history"
# An activity date in the past is the normal case: history is entered before
# partners are given access.
BACK=$(jsonfile upd-back <<'JSON'
{"milestoneTag":"land_prep","title":"Land prepared across all 10 acres","description":"Ploughing and levelling finished; drip mains laid.","activityDate":"2026-02-20","notifyPartners":false,"publish":true}
JSON
)
expect 'a back-dated update is accepted' 201 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem back)" --data-binary "@$BACK"

FUTURE=$(jsonfile upd-future <<'JSON'
{"milestoneTag":"growth","title":"Next week","description":"Not yet happened.","activityDate":"2099-01-01","publish":false}
JSON
)
expect 'a future activity date is refused' 400 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem fut)" --data-binary "@$FUTURE"

echo
echo "== updates: draft stays internal until published"
DRAFT=$(jsonfile upd-draft <<'JSON'
{"milestoneTag":"growth","title":"Week 12 plant-health notes","description":"Average height 1.2 m.","activityDate":"2026-08-04","publish":false}
JSON
)
expect 'a draft is created' 201 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem draft)" --data-binary "@$DRAFT"
DID=$(field "$WORK/last.json" "['id']")
assert 'and it is a draft' "$(field "$WORK/last.json" "['status']")" draft

authed "$PT" -o "$WORK/feed1.json" "$BASE/v1/projects/$P6/updates/feed"
assert 'the draft is absent from the partner feed' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/feed1.json',encoding='utf-8'))
print('yes' if any(i['id']=='$DID' for i in d['items']) else 'no')")" no
expect_code 'and a partner cannot fetch it directly' 404 not_found \
  "$BASE/v1/projects/$P6/updates/$DID" -H "authorization: Bearer $PT"

echo
echo "== updates: publish notifies, and a replayed key does not notify twice"
BEFORE=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='update_published';")
KEY=$(idem pub)
expect 'publish the draft' 200 -X POST "$BASE/v1/projects/$P6/updates/$DID/publish" \
  -H "authorization: Bearer $AT" -H "idempotency-key: $KEY" -H 'content-length: 0'
expect_code 'publishing twice is refused' 409 already_published -X POST "$BASE/v1/projects/$P6/updates/$DID/publish" \
  -H "authorization: Bearer $AT" -H "idempotency-key: $(idem pub2)" -H 'content-length: 0'
AFTER=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='update_published';")
assert 'notify was off for this update, so nobody was told' "$AFTER" "$BEFORE"

NOTIFY=$(jsonfile upd-notify <<'JSON'
{"milestoneTag":"nutrition","title":"Fertilizer dose, week 14","description":"Second split dose of 19:19:19 across all 10 acres.","activityDate":"2026-08-28","notifyPartners":true,"publish":true}
JSON
)
KEY2=$(idem notify)
expect 'publish-on-create with notify' 201 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $KEY2" --data-binary "@$NOTIFY"
NID=$(field "$WORK/last.json" "['id']")
COUNT1=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='update_published';")
assert 'all three mapped partners were notified' "$COUNT1" "$((BEFORE + 3))"

curl -s -o "$WORK/replay.json" -D "$WORK/replay.h" -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $KEY2" --data-binary "@$NOTIFY"
assert 'the replay is flagged' \
  "$(grep -ci 'idempotent-replay' "$WORK/replay.h" || true)" 1
assert 'and returns the same update' "$(field "$WORK/replay.json" "['id']")" "$NID"
COUNT2=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='update_published';")
assert 'nobody was notified a second time' "$COUNT2" "$COUNT1"

MISMATCH=$(jsonfile upd-mismatch <<'JSON'
{"milestoneTag":"irrigation","title":"Different body, same key","description":"This is not the original request.","activityDate":"2026-08-29","publish":false}
JSON
)
expect_code 'the same key with a different body is a mistake, not a replay' 409 idempotency_mismatch \
  -X POST "$BASE/v1/projects/$P6/updates" -H "authorization: Bearer $AT" \
  -H 'content-type: application/json' -H "idempotency-key: $KEY2" --data-binary "@$MISMATCH"

echo
echo "== updates: the partner feed and tenancy"
authed "$PT" -o "$WORK/feed2.json" "$BASE/v1/projects/$P6/updates/feed"
assert 'published updates are visible' \
  "$(field "$WORK/feed2.json" "['items'].__len__()")" 3
assert 'newest activity date first' \
  "$(field "$WORK/feed2.json" "['items'][0]['activityDate']")" 2026-08-28
expect_code 'another project feed is not found' 404 not_found \
  "$BASE/v1/projects/$P4/updates/feed" -H "authorization: Bearer $PT"
expect_code 'a partner cannot post an update' 403 forbidden -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem rogue)" --data-binary "@$DRAFT"

echo
echo "== updates: opening one records a silent read receipt"
expect 'partner opens a published update' 200 "$BASE/v1/projects/$P6/updates/$NID" -H "authorization: Bearer $PT"
RECEIPTS=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from read_receipts where entity_type='project_update' and entity_id='$NID';")
assert 'a receipt was written without any acknowledgement step' "$RECEIPTS" 1

echo
echo "== activity log"
ACT=$(jsonfile act <<'JSON'
{"title":"Irrigation, 11 hrs, blocks A-D","detail":"Drip run after fertigation.","activityDate":"2026-09-02"}
JSON
)
expect 'admin logs an operation' 201 -X POST "$BASE/v1/projects/$P6/activity" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$ACT"
expect 'partner reads the activity log' 200 "$BASE/v1/projects/$P6/activity" -H "authorization: Bearer $PT"
expect_code 'but not another project(s)' 404 not_found "$BASE/v1/projects/$P4/activity" -H "authorization: Bearer $PT"

echo
echo "== MIS: a period is unique, and a report needs its PDF before it publishes"
# An uploaded report carries its PDF from the start, which is how the admin
# actually works: pick the project and month, attach the file, publish.
DOC=$(upload_pdf "$P6" mis_report)
MISB=$(printf '{"month":8,"year":2026,"title":"August 2026","source":"uploaded","documentId":"%s","narrative":"Bunch emergence running a week ahead."}' "$DOC" | jsonfile mis-create)
expect 'create the August report with its PDF' 201 -X POST "$BASE/v1/projects/$P6/mis"   -H "authorization: Bearer $AT" -H 'content-type: application/json'   -H "idempotency-key: $(idem misaug)" --data-binary "@$MISB"
RID=$(field "$WORK/last.json" "['id']")
expect_code 'the same period twice is refused' 409 mis_period_exists -X POST "$BASE/v1/projects/$P6/mis"   -H "authorization: Bearer $AT" -H 'content-type: application/json'   -H "idempotency-key: $(idem misdup)" --data-binary "@$MISB"

NODOC=$(jsonfile mis-uploaded-nodoc <<'JSON'
{"month":7,"year":2026,"title":"July 2026","source":"uploaded"}
JSON
)
expect 'an uploaded report with no documentId is refused up front' 400 -X POST "$BASE/v1/projects/$P6/mis"   -H "authorization: Bearer $AT" -H 'content-type: application/json'   -H "idempotency-key: $(idem misnodocid)" --data-binary "@$NODOC"

# A generated report has no PDF until one is rendered, so it is the path that
# reaches the publish-time check.
GEN=$(jsonfile mis-generated <<'JSON'
{"month":6,"year":2026,"title":"June 2026","source":"generated","narrative":"Composed from platform data."}
JSON
)
expect 'create a generated report with no PDF' 201 -X POST "$BASE/v1/projects/$P6/mis"   -H "authorization: Bearer $AT" -H 'content-type: application/json'   -H "idempotency-key: $(idem misgencreate)" --data-binary "@$GEN"
GID=$(field "$WORK/last.json" "['id']")
# A generated report carries no PDF until it publishes: the server renders one
# from the composed figures, so the admin never has to attach a file.
expect 'composing it pulls the figures together' 200 -X POST "$BASE/v1/projects/$P6/mis/$GID/compose" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
expect 'a generated report publishes with no PDF attached' 200 \
  -X POST "$BASE/v1/projects/$P6/mis/$GID/publish" -H "authorization: Bearer $AT" \
  -H "idempotency-key: $(idem misgen)" -H 'content-length: 0'
GENDOC=$(field "$WORK/last.json" "['documentId']")
assert 'and the server rendered its document' \
  "$([ -n "$GENDOC" ] && [ "$GENDOC" != None ] && echo yes || echo no)" yes

authed "$AT" -o "$WORK/gendl.json" "$BASE/v1/documents/$GENDOC/download-url"
curl -s -o "$WORK/generated.pdf" "$(field "$WORK/gendl.json" "['downloadUrl']")"
assert 'which downloads as a real PDF' \
  "$(head -c 4 "$WORK/generated.pdf")" '%PDF'

echo
echo "== MIS: a draft is invisible to partners"
authed "$PT" -o "$WORK/arch1.json" "$BASE/v1/projects/$P6/mis"
assert 'the published report is visible but the draft is not' \
  "$(field "$WORK/arch1.json" "['items'].__len__()")" 1
expect_code 'and it cannot be fetched directly' 404 not_found \
  "$BASE/v1/projects/$P6/mis/$RID" -H "authorization: Bearer $PT"

echo
echo "== MIS: publish, notify, and the unread badge"
MISBEFORE=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='mis_published';")
expect 'publish the report' 200 -X POST "$BASE/v1/projects/$P6/mis/$RID/publish" \
  -H "authorization: Bearer $AT" -H "idempotency-key: $(idem misok)" -H 'content-length: 0'
MISAFTER=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='mis_published';")
assert 'every mapped partner was notified' "$MISAFTER" "$((MISBEFORE + 3))"
expect_code 'publishing twice is refused' 409 already_published \
  -X POST "$BASE/v1/projects/$P6/mis/$RID/publish" -H "authorization: Bearer $AT" \
  -H "idempotency-key: $(idem misok2)" -H 'content-length: 0'

authed "$PT" -o "$WORK/arch2.json" "$BASE/v1/projects/$P6/mis"
assert 'the partner now sees both' "$(field "$WORK/arch2.json" "['items'].__len__()")" 2
assert 'flagged new because it is unread' "$(field "$WORK/arch2.json" "['items'][0]['isNew']")" True
assert 'with a readable period label' "$(field "$WORK/arch2.json" "['items'][0]['label']")" 'August 2026'

expect 'the partner opens it' 200 "$BASE/v1/projects/$P6/mis/$RID" -H "authorization: Bearer $PT"
authed "$PT" -o "$WORK/arch3.json" "$BASE/v1/projects/$P6/mis"
assert 'opening it clears the new flag' "$(field "$WORK/arch3.json" "['items'][0]['isNew']")" False
assert 'and marks it read' "$(field "$WORK/arch3.json" "['items'][0]['isRead']")" True

echo
echo "== MIS: read receipts are what the admin chases"
authed "$AT" -o "$WORK/rec.json" "$BASE/v1/projects/$P6/mis/$RID/receipts"
assert 'all three partners are listed' \
  "$(field "$WORK/rec.json" "['recipients'].__len__()")" 3
assert 'exactly one has opened it' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/rec.json',encoding='utf-8'))
print(sum(1 for r in d['recipients'] if r['isRead']))")" 1

echo
echo "== MIS: tenancy and the latest-report banner"
expect_code 'a partner from another project sees nothing' 404 not_found \
  "$BASE/v1/projects/$P6/mis/$RID" -H "authorization: Bearer $OTHER"
expect 'the dashboard banner endpoint works' 200 "$BASE/v1/me/mis/latest" -H "authorization: Bearer $PT"

echo
echo "== MIS: compose pulls real figures from the ledger and the updates feed"
expect 'compose the generated report' 200 -X POST "$BASE/v1/projects/$P6/mis/$RID/compose" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
assert 'it counted the published updates in the period' \
  "$(field "$WORK/last.json" "['updateCount']")" 2

summary 'content'
