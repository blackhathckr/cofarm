#!/usr/bin/env bash
# Scope §2.1.5 (messaging, documents, e-sign) and §2.2.7 (approvals, reminders).
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')      # Rajesh, MYSBN06
OTHER=$(partner_token '+919845022117')   # Amit, MYSBN04
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)

upload_pdf() { # upload_pdf <projectId> <type> -> documentId
  local project=$1 kind=$2 size req doc url
  printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' >"$WORK/agree.pdf"
  size=$(wc -c <"$WORK/agree.pdf" | tr -d ' ')
  req=$(printf '{"projectId":"%s","type":"%s","originalName":"agreement.pdf","mime":"application/pdf","sizeBytes":%s}' "$project" "$kind" "$size" | jsonfile sig-up)
  curl -s -o "$WORK/up.json" -X POST "$BASE/v1/documents/upload-url" \
    -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$req"
  doc=$(field "$WORK/up.json" "['documentId']")
  url=$(field "$WORK/up.json" "['uploadUrl']")
  curl -s -o /dev/null -X PUT "$url" -H 'content-type: application/pdf' --data-binary "@$WORK/agree.pdf"
  curl -s -o /dev/null -X POST "$BASE/v1/documents/$doc/confirm" \
    -H "authorization: Bearer $AT" -H 'content-length: 0'
  printf '%s' "$doc"
}

RAJESH=$(authed "$AT" "$BASE/v1/projects/$P6/partners" | python -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name'].startswith('Rajesh'): print(p['partnerId']); break")

echo "== messaging: a partner opens their thread, which is created on first access"
expect 'GET the project thread' 200 "$BASE/v1/projects/$P6/thread" -H "authorization: Bearer $PT"
THREAD=$(field "$WORK/last.json" "['id']")
assert 'it starts empty' "$(field "$WORK/last.json" "['messages'].__len__()")" 0

MSG=$(jsonfile msg-1 <<'JSON'
{"body":"Can I get the Cycle 1 P&L as a PDF for my CA before 15 September?"}
JSON
)
expect 'the partner sends a message' 201 -X POST "$BASE/v1/projects/$P6/thread/messages" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$MSG"

expect 'GET it again returns the same thread, not a second one' 200 "$BASE/v1/projects/$P6/thread" -H "authorization: Bearer $PT"
assert 'same thread id' "$(field "$WORK/last.json" "['id']")" "$THREAD"
assert 'with the message on it' "$(field "$WORK/last.json" "['messages'].__len__()")" 1

THREADS=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from message_threads where project_id='$P6' and user_id=(select id from users where mobile='+919845022114');")
assert 'exactly one thread row exists for this partner and project' "$THREADS" 1

echo
echo "== the admin inbox sees it and can reply"
authed "$AT" -o "$WORK/inbox.json" "$BASE/v1/threads"
assert 'the thread is in the inbox' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/inbox.json',encoding='utf-8'))
print('yes' if any(t['id']=='$THREAD' for t in d['items']) else 'no')")" yes
assert 'with one unread from the partner' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/inbox.json',encoding='utf-8'))
print(next(t['unreadFromPartnerCount'] for t in d['items'] if t['id']=='$THREAD'))")" 1

REPLY=$(jsonfile msg-reply <<'JSON'
{"body":"Yes — the statement PDF is on the Harvest screen, and I will email a copy today."}
JSON
)
expect 'the admin replies' 201 -X POST "$BASE/v1/threads/$THREAD/messages" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$REPLY"
# One readAt column and no admin-side read endpoint, so replying is what clears it.
authed "$AT" -o "$WORK/inbox2.json" "$BASE/v1/threads"
assert 'replying clears the unread-from-partner count' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/inbox2.json',encoding='utf-8'))
print(next(t['unreadFromPartnerCount'] for t in d['items'] if t['id']=='$THREAD'))")" 0

NOTIFS=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='message_received';")
assert 'both sides were notified' "$([ "$NOTIFS" -ge 2 ] && echo yes || echo no)" yes

echo
echo "== resolve and reopen"
expect 'resolve the thread' 200 -X POST "$BASE/v1/threads/$THREAD/resolve" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
authed "$AT" -o "$WORK/t3.json" "$BASE/v1/threads/$THREAD"
assert 'status is resolved' "$(field "$WORK/t3.json" "['status']")" resolved
expect 'reopen it' 200 -X POST "$BASE/v1/threads/$THREAD/reopen" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'

echo
echo "== messaging tenancy"
expect_code 'a partner cannot open another project(s) thread' 404 not_found \
  "$BASE/v1/projects/$P6/thread" -H "authorization: Bearer $OTHER"
expect_code 'nor read a thread by id through the admin route' 403 forbidden \
  "$BASE/v1/threads/$THREAD" -H "authorization: Bearer $PT"
expect 'the partner lists only their own threads' 200 "$BASE/v1/me/threads" -H "authorization: Bearer $PT"
assert 'one thread' "$(field "$WORK/last.json" ".__len__()")" 1

echo
echo "== signatures: issue an agreement for signing"
DOC=$(upload_pdf "$P6" agreement)
ISSUE=$(printf '{"documentId":"%s","userId":"%s","note":"Cycle 2 addendum for your signature"}' "$DOC" "$RAJESH" | jsonfile sig-issue)
expect 'issue the document' 201 -X POST "$BASE/v1/projects/$P6/signatures"   -H "idempotency-key: $(idem sigissue)" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$ISSUE"
REQ=$(field "$WORK/last.json" "['id']")
assert 'it starts pending' "$(field "$WORK/last.json" "['status']")" pending

ISSUED=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications where type='document_issued';")
assert 'the partner was told' "$([ "$ISSUED" -ge 1 ] && echo yes || echo no)" yes

echo
echo "== only the named partner may sign, and signing needs an affirmative act"
expect 'the partner sees it in their own list' 200 "$BASE/v1/me/signatures" -H "authorization: Bearer $PT"
assert 'one pending request' \
  "$(python -c "
import json,sys;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
items=d['items'] if isinstance(d,dict) else d
print(sum(1 for i in items if i['status']=='pending'))")" 1

NOTMINE=$(jsonfile sig-notmine <<'JSON'
{"signedName":"Amit Mehra","agreed":true}
JSON
)
# Not forbidden — not found. A 403 would confirm the document exists.
expect_code 'another partner cannot sign it' 404 not_found -X POST "$BASE/v1/signatures/$REQ/sign" \
  -H "authorization: Bearer $OTHER" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem signx)" --data-binary "@$NOTMINE"

REFUSED=$(jsonfile sig-refused <<'JSON'
{"signedName":"Rajesh Kumar","agreed":false}
JSON
)
expect 'agreed:false is refused — a signature is an affirmative act' 400 -X POST "$BASE/v1/signatures/$REQ/sign" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem signf)" --data-binary "@$REFUSED"

BLANK=$(jsonfile sig-blank <<'JSON'
{"signedName":"","agreed":true}
JSON
)
expect 'an empty signed name is refused' 400 -X POST "$BASE/v1/signatures/$REQ/sign" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem signb)" --data-binary "@$BLANK"

SIGN=$(jsonfile sig-ok <<'JSON'
{"signedName":"Rajesh Kumar","agreed":true}
JSON
)
expect 'the partner signs' 200 -X POST "$BASE/v1/signatures/$REQ/sign" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem signok)" --data-binary "@$SIGN"
assert 'status is signed' "$(field "$WORK/last.json" "['status']")" signed
assert 'and the name is recorded' "$(field "$WORK/last.json" "['signedName']")" 'Rajesh Kumar'

SIGNED_AT=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select case when signed_at is null then 'null' else 'set' end from signature_requests where id='$REQ';")
assert 'with a timestamp' "$SIGNED_AT" set
SIGNED_IP=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select case when signed_ip is null then 'null' else 'set' end from signature_requests where id='$REQ';")
assert 'and the originating address, for the audit trail' "$SIGNED_IP" set

echo
echo "== signing the agreement settles the membership(s) agreement status"
authed "$AT" -o "$WORK/rk.json" "$BASE/v1/partners/$RAJESH"
assert 'the membership now reads signed' \
  "$(field "$WORK/rk.json" "['memberships'][0]['agreementStatus']")" signed

echo
echo "== a settled request is closed to further action"
expect_code 'signing twice is refused' 409 signature_already_settled -X POST "$BASE/v1/signatures/$REQ/sign" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem sign2)" --data-binary "@$SIGN"
expect_code 'reminding a signed request is refused' 409 signature_already_settled \
  -X POST "$BASE/v1/signatures/$REQ/remind" -H "authorization: Bearer $AT" -H 'content-length: 0'
expect_code 'cancelling a signed request is refused' 409 signature_already_settled \
  -X POST "$BASE/v1/signatures/$REQ/cancel" -H "authorization: Bearer $AT" -H 'content-length: 0'

echo
echo "== reminders on what is still outstanding"
PRIYA=$(authed "$AT" "$BASE/v1/projects/$P6/partners" | python -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name'].startswith('Priya'): print(p['partnerId']); break")
DOC2=$(upload_pdf "$P6" agreement)
ISSUE2=$(printf '{"documentId":"%s","userId":"%s"}' "$DOC2" "$PRIYA" | jsonfile sig-issue2)
expect 'issue a second agreement' 201 -X POST "$BASE/v1/projects/$P6/signatures"   -H "idempotency-key: $(idem sigissue2)" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$ISSUE2"
REQ2=$(field "$WORK/last.json" "['id']")

expect 'remind that one' 200 -X POST "$BASE/v1/signatures/$REQ2/remind" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
REMINDED=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select case when reminded_at is null then 'null' else 'set' end from signature_requests where id='$REQ2';")
assert 'the reminder is stamped' "$REMINDED" set

ALL=$(printf '{"projectId":"%s"}' "$P6" | jsonfile remind-all)
expect 'remind everyone still outstanding on the project' 200 -X POST "$BASE/v1/signatures/remind-all" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem remall)" --data-binary "@$ALL"

expect 'cancel the outstanding one' 200 -X POST "$BASE/v1/signatures/$REQ2/cancel" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
authed "$AT" -o "$WORK/sigs.json" "$BASE/v1/signatures?projectId=$P6"
assert 'it reads cancelled' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/sigs.json',encoding='utf-8'))
items=d['items'] if isinstance(d,dict) else d
print(next(i['status'] for i in items if i['id']=='$REQ2'))")" cancelled

echo
echo "== signature tenancy"
expect_code 'a partner cannot issue a document' 403 forbidden -X POST "$BASE/v1/projects/$P6/signatures"   -H "idempotency-key: $(idem sigrogue)" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$ISSUE"
expect_code 'nor read the admin list' 403 forbidden "$BASE/v1/signatures" -H "authorization: Bearer $PT"

summary 'messaging'
