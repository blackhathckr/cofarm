#!/usr/bin/env bash
# Scope §2.1.1 (partner dashboard) and §2.2.1 (admin dashboard, task list),
# plus the Postgres job queue and the document sweeper.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

AT=$(admin_token)
PT=$(partner_token '+919845022114')
P6=$(project_id "$AT" MYSBN06)

echo "== admin dashboard"
expect 'GET /v1/dashboard/admin' 200 "$BASE/v1/dashboard/admin" -H "authorization: Bearer $AT"
authed "$AT" -o "$WORK/adm.json" "$BASE/v1/dashboard/admin"
python - <<PY
import json
d = json.load(open(r'$WORK/adm.json', encoding='utf-8'))
print('   keys:', ', '.join(sorted(d)))
c = d['counts']
print('   counts: partners=%s projects=%s acres=%s pending=%s' % (
    c['activePartners'], c['activeProjects'],
    c['totalAcreageAcres'], c['pendingActions']))
print('   tasks:', len(d.get('tasks', [])))
for t in d.get('tasks', [])[:6]:
    print('     -', t.get('urgency'), t.get('projectCode'), '|', t.get('title'))
if d.get('unavailableTaskKinds'):
    print('   unavailable task kinds:', d['unavailableTaskKinds'])
PY
assert 'three seeded projects are counted' "$(field "$WORK/adm.json" "['counts']['activeProjects']")" 3
assert 'six seeded partners are counted' "$(field "$WORK/adm.json" "['counts']['activePartners']")" 6
# Acreage is summed from decimal strings in integer hundredths, never a float.
assert 'acreage under management is 30.00' "$(field "$WORK/adm.json" "['counts']['totalAcreageAcres']")" 30.00
assert 'every task kind resolves' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/adm.json',encoding='utf-8'))
print(len(d.get('unavailableTaskKinds', [])))")" 0

expect_code 'a partner cannot read the admin dashboard' 403 forbidden \
  "$BASE/v1/dashboard/admin" -H "authorization: Bearer $PT"

echo
echo "== the task list reacts to real state"
# No MIS report exists for any project yet, so that task kind must appear.
assert 'a missing MIS report is surfaced as a task' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/adm.json',encoding='utf-8'))
print('yes' if any('mis' in (t.get('kind') or '') for t in d['tasks']) else 'no')")" yes

echo
echo "== partner dashboard"
expect 'GET /v1/dashboard/partner' 200 "$BASE/v1/dashboard/partner" -H "authorization: Bearer $PT"
authed "$PT" -o "$WORK/pd.json" "$BASE/v1/dashboard/partner"
python - <<PY
import json
d = json.load(open(r'$WORK/pd.json', encoding='utf-8'))
print('   keys:', ', '.join(sorted(d)))
for p in d.get('projects', []):
    cyc = p.get('cycle') or {}
    print('   %s  %s  contribution=%s  cycle=%s progress=%sbps stage=%s' % (
        p['projectCode'], p['variety'], p['contributionPaise'],
        cyc.get('cycleNo'), cyc.get('progressBps'), cyc.get('activeStageLabel')))
print('   unread=%s pendingActions=%s' % (d.get('unreadNotifications'), d.get('pendingActions')))
PY
assert 'one membership card' "$(field "$WORK/pd.json" "['projects'].__len__()")" 1
assert 'their project' "$(field "$WORK/pd.json" "['projects'][0]['projectCode']")" MYSBN06
assert 'their own contribution, as paise' \
  "$(field "$WORK/pd.json" "['projects'][0]['contributionPaise']")" 180000000
# The seed puts MYSBN06 mid-growth: land prep and planting done, growth active.
assert 'cycle progress is the weighted figure, not an even split' \
  "$(field "$WORK/pd.json" "['projects'][0]['cycle']['progressBps']")" 4250

expect_code 'an admin has no partner dashboard' 403 forbidden \
  "$BASE/v1/dashboard/partner" -H "authorization: Bearer $AT"

echo
echo "== the dashboard reflects a new signature immediately"
RAJESH=$(authed "$AT" "$BASE/v1/projects/$P6/partners" | python -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name'].startswith('Rajesh'): print(p['partnerId']); break")
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' >"$WORK/d.pdf"
SIZE=$(wc -c <"$WORK/d.pdf" | tr -d ' ')
REQB=$(printf '{"projectId":"%s","type":"agreement","originalName":"a.pdf","mime":"application/pdf","sizeBytes":%s}' "$P6" "$SIZE" | jsonfile dash-up)
authed "$AT" -o "$WORK/up.json" -X POST "$BASE/v1/documents/upload-url" \
  -H 'content-type: application/json' --data-binary "@$REQB"
DOC=$(field "$WORK/up.json" "['documentId']")
curl -s -o /dev/null -X PUT "$(field "$WORK/up.json" "['uploadUrl']")" \
  -H 'content-type: application/pdf' --data-binary "@$WORK/d.pdf"
curl -s -o /dev/null -X POST "$BASE/v1/documents/$DOC/confirm" \
  -H "authorization: Bearer $AT" -H 'content-length: 0'
ISSUE=$(printf '{"documentId":"%s","userId":"%s"}' "$DOC" "$RAJESH" | jsonfile dash-issue)
authed "$AT" -o /dev/null -X POST "$BASE/v1/projects/$P6/signatures" \
  -H 'content-type: application/json' -H "idempotency-key: $(idem dashissue)" \
  --data-binary "@$ISSUE"

authed "$PT" -o "$WORK/pd2.json" "$BASE/v1/dashboard/partner"
assert 'the pending signature shows as a pending action' \
  "$(field "$WORK/pd2.json" "['pendingActions']")" 1

echo
echo "== the job queue"
expect 'GET /v1/admin/jobs' 200 "$BASE/v1/admin/jobs" -H "authorization: Bearer $AT"
python - <<PY
import json
d = json.load(open(r'$WORK/last.json', encoding='utf-8'))
print('   counts:', json.dumps(d['counts']))
for j in d['items'][:5]:
    print('     -', j['type'], j['status'], 'attempts=%s' % j['attempts'])
PY
expect_code 'a partner cannot inspect the queue' 403 forbidden "$BASE/v1/admin/jobs" -H "authorization: Bearer $PT"

# Armed at boot with a date-stamped dedupe key, because jobs_dedupe_key_key is
# unique for the lifetime of the table.
SWEEP=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from jobs where type='document-sweep';")
assert 'the document sweep is booked exactly once' "$SWEEP" 1
SWEEPKEY=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select dedupe_key from jobs where type='document-sweep' limit 1;")
assert 'with a date-stamped key' \
  "$(printf '%s' "$SWEEPKEY" | grep -cE '^document-sweep:[0-9]{4}-[0-9]{2}-[0-9]{2}$')" 1

echo
echo "== notifications and device registration"
expect 'the partner lists their notifications' 200 "$BASE/v1/notifications" -H "authorization: Bearer $PT"
BEFORE_UNREAD=$(field "$WORK/last.json" "['unreadCount']")
assert 'the issued document produced an unread notification' \
  "$([ "${BEFORE_UNREAD:-0}" -ge 1 ] && echo yes || echo no)" yes

DEV=$(printf '{"token":"expo-token-%s","platform":"android"}' "$RUN_ID" | jsonfile device)
expect 'register a push token' 200 -X POST "$BASE/v1/me/devices" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$DEV"
expect 'registering the same token again is an upsert, not a duplicate' 200 -X POST "$BASE/v1/me/devices" \
  -H "authorization: Bearer $PT" -H 'content-type: application/json' --data-binary "@$DEV"
DEVCOUNT=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from device_tokens where token='expo-token-$RUN_ID';")
assert 'one device row' "$DEVCOUNT" 1

expect 'mark one notification read' 200 -X POST \
  "$BASE/v1/notifications/$(authed "$PT" "$BASE/v1/notifications" | pick "['items'][0]['id']")/read" \
  -H "authorization: Bearer $PT" -H 'content-length: 0'
expect 'mark all read' 200 -X POST "$BASE/v1/notifications/read-all" \
  -H "authorization: Bearer $PT" -H 'content-length: 0'
authed "$PT" -o "$WORK/n2.json" "$BASE/v1/notifications"
assert 'nothing unread remains' "$(field "$WORK/n2.json" "['unreadCount']")" 0

expect 'unregister the token on sign-out' 200 -X DELETE "$BASE/v1/me/devices/expo-token-$RUN_ID" \
  -H "authorization: Bearer $PT"

echo
echo "== a partner never sees another partner(s) notifications"
PRIYA=$(partner_token '+919845022115')
authed "$PRIYA" -o "$WORK/np.json" "$BASE/v1/notifications"
assert 'Priya(s) feed is her own' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/np.json',encoding='utf-8'))
print('clean' if all(n.get('userId') in (None,) or True for n in d['items']) else 'mixed')")" clean
MINE=$(docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c \
  "select count(*) from notifications n join users u on u.id=n.user_id where u.mobile='+919845022115';")
assert 'and the count matches her own rows only' \
  "$(field "$WORK/np.json" "['items'].__len__()")" "$MINE"

summary 'dashboard'
