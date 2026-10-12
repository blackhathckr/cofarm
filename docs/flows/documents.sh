#!/usr/bin/env bash
# Scope §2.3 (document generation / private storage) — the full upload
# round-trip through object storage, not just the metadata rows.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')
P6=$(project_id "$AT" MYSBN06)
P4=$(project_id "$AT" MYSBN04)

# A real PDF, so the mime and the bytes agree.
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' >"$WORK/report.pdf"
SIZE=$(wc -c <"$WORK/report.pdf" | tr -d ' ')

echo "== presigned upload"
REQ=$(printf '{"projectId":"%s","type":"mis_report","originalName":"aug-2026.pdf","mime":"application/pdf","sizeBytes":%s}' "$P6" "$SIZE" | jsonfile doc-req)
expect 'POST /v1/documents/upload-url' 201 -X POST "$BASE/v1/documents/upload-url" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$REQ"
DOC=$(field "$WORK/last.json" "['documentId']")
URL=$(field "$WORK/last.json" "['uploadUrl']")
assert 'a signed upload url came back' "$([ -n "$URL" ] && echo yes || echo no)" yes

echo
echo "== a row whose object never arrived cannot be confirmed"
expect_code 'confirm before upload' 422 upload_incomplete -X POST "$BASE/v1/documents/$DOC/confirm" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'

echo
echo "== upload the bytes straight to storage, then confirm"
PUT=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$URL" -H 'content-type: application/pdf' --data-binary "@$WORK/report.pdf")
assert 'PUT to the presigned url' "$PUT" 200
expect 'confirm reads the real size back from storage' 200 -X POST "$BASE/v1/documents/$DOC/confirm" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
assert 'stored size matches the bytes sent' "$(field "$WORK/last.json" "['sizeBytes']")" "$SIZE"

echo
echo "== download is a short-lived signed url, and the bytes round-trip"
expect 'GET download-url as admin' 200 "$BASE/v1/documents/$DOC/download-url" -H "authorization: Bearer $AT"
DL=$(field "$WORK/last.json" "['downloadUrl']")
assert 'filename preserved' "$(field "$WORK/last.json" "['originalName']")" aug-2026.pdf
curl -s -o "$WORK/back.pdf" "$DL"
assert 'downloaded bytes are identical' \
  "$(cmp -s "$WORK/report.pdf" "$WORK/back.pdf" && echo same || echo different)" same

echo
echo "== tenancy on documents"
expect 'the project partner may fetch a url' 200 "$BASE/v1/documents/$DOC/download-url" -H "authorization: Bearer $PT"
OTHER=$(partner_token '+919845022117')  # Amit, on MYSBN04
expect_code 'a partner from another project gets 404, not 403' 404 not_found \
  "$BASE/v1/documents/$DOC/download-url" -H "authorization: Bearer $OTHER"
expect_code 'and cannot request an upload into a project they are not in' 403 forbidden \
  -X POST "$BASE/v1/documents/upload-url" -H "authorization: Bearer $OTHER" \
  -H 'content-type: application/json' --data-binary "@$REQ"

echo
echo "== the allowlist"
BADMIME=$(printf '{"projectId":"%s","type":"other","originalName":"x.exe","mime":"application/x-msdownload","sizeBytes":10}' "$P6" | jsonfile doc-badmime)
expect_code 'an unlisted mime is refused at the boundary' 400 validation_failed \
  -X POST "$BASE/v1/documents/upload-url" -H "authorization: Bearer $AT" \
  -H 'content-type: application/json' --data-binary "@$BADMIME"

HUGE=$(printf '{"projectId":"%s","type":"mis_report","originalName":"big.pdf","mime":"application/pdf","sizeBytes":99999999}' "$P6" | jsonfile doc-huge)
expect 'an oversized pdf is refused' 400 -X POST "$BASE/v1/documents/upload-url" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$HUGE"

echo
echo "== listing hides rows whose upload never completed"
PENDING=$(printf '{"projectId":"%s","type":"other","originalName":"never.pdf","mime":"application/pdf","sizeBytes":%s}' "$P6" "$SIZE" | jsonfile doc-pending)
authed "$AT" -X POST "$BASE/v1/documents/upload-url" -H 'content-type: application/json' \
  --data-binary "@$PENDING" >"$WORK/pending.json"
PENDING_ID=$(field "$WORK/pending.json" "['documentId']")

authed "$AT" "$BASE/v1/documents?projectId=$P6&limit=50" >"$WORK/list.json"
CONFIRMED_SEEN=$(python -c "
import json;d=json.load(open(r'$WORK/list.json',encoding='utf-8'))
print('yes' if any(i['id']=='$DOC' for i in d['items']) else 'no')")
PENDING_SEEN=$(python -c "
import json;d=json.load(open(r'$WORK/list.json',encoding='utf-8'))
print('yes' if any(i['id']=='$PENDING_ID' for i in d['items']) else 'no')")
assert 'a confirmed document is listed' "$CONFIRMED_SEEN" yes
assert 'an unconfirmed one is not' "$PENDING_SEEN" no

authed "$AT" "$BASE/v1/documents?projectId=$P6&includePending=true&limit=50" >"$WORK/list2.json"
assert 'until pending rows are asked for' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/list2.json',encoding='utf-8'))
print('yes' if any(i['id']=='$PENDING_ID' for i in d['items']) else 'no')")" yes

echo
echo "== delete removes the row and the bytes"
expect 'DELETE an unreferenced document' 200 -X DELETE "$BASE/v1/documents/$PENDING_ID" -H "authorization: Bearer $AT"
expect_code 'and it is gone' 404 not_found "$BASE/v1/documents/$PENDING_ID/download-url" -H "authorization: Bearer $AT"

expect 'DELETE the confirmed one' 200 -X DELETE "$BASE/v1/documents/$DOC" -H "authorization: Bearer $AT"
GONE=$(curl -s -o /dev/null -w '%{http_code}' "$DL")
assert 'the object itself is no longer served' "$([ "$GONE" = "200" ] && echo still-there || echo gone)" gone

summary 'documents'
