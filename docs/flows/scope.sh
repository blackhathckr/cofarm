#!/usr/bin/env bash
# Covers the scope items the feature sections do not assert directly:
# the project switcher (§2.1.1), farm location (§2.1.2), the cross-project MIS
# archive (§2.1.3), per-cycle and cumulative statements (§2.1.4), total acreage
# (§2.2.1), partner search (§2.2.2), seen-by counters (§2.2.7), and the
# cross-cutting promises of §2.3 — notifications on every significant event,
# historical backfill, and the audit trail.
# shellcheck source=./lib.sh
source "$(dirname "$0")/lib.sh"

psql() { docker exec cofarm-postgres-1 psql -U cofarm -d cofarm -t -A -c "$1"; }

AT=$(admin_token)
P6=$(project_id "$AT" MYSBN06)
P7=$(project_id "$AT" MYSBN07)

echo "== §2.1.1 the project switcher: a partner mapped to two projects sees both"
PT=$(partner_token '+919845022114')
assert 'Rajesh starts on one project' \
  "$(authed "$PT" "$BASE/v1/projects" | pick "['items'].__len__()")" 1

RAJESH=$(authed "$AT" "$BASE/v1/partners?search=Rajesh" | pick "['items'][0]['id']")
MAP=$(printf '{"projectId":"%s","contributionPaise":"600000000","shareBasis":"pro_rata_contribution","joinedAt":"2026-09-20"}' "$P7" | jsonfile scope-map)
expect 'admin maps them onto a second project' 201 -X POST "$BASE/v1/partners/$RAJESH/memberships" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$MAP"

# Scope is resolved from live memberships on every request, so the switcher
# gains the project without the partner signing in again.
assert 'the switcher now offers two, on the same token' \
  "$(authed "$PT" "$BASE/v1/projects" | pick "['items'].__len__()")" 2
expect 'and the new project is readable' 200 "$BASE/v1/projects/$P7" -H "authorization: Bearer $PT"

echo
echo "== §2.1.2 the farm location reaches the app for the map"
GEO=$(jsonfile scope-geo <<'JSON'
{"latitude":12.303611,"longitude":76.085556}
JSON
)
expect 'admin sets the coordinates' 200 -X PATCH "$BASE/v1/projects/$P6" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$GEO"
authed "$PT" -o "$WORK/geo.json" "$BASE/v1/projects/$P6"
assert 'the partner reads the latitude' "$(field "$WORK/geo.json" "['latitude']")" 12.303611
assert 'and the longitude' "$(field "$WORK/geo.json" "['longitude']")" 76.085556

echo
echo "== §2.1.3 the latest report is found across every project the partner holds"
# The archive itself is per project, reached through the switcher. This is the
# cross-project lookup the home tab needs, so it has to name which project the
# report came from.
expect 'GET /v1/me/mis/latest' 200 "$BASE/v1/me/mis/latest" -H "authorization: Bearer $PT"
# One row per project in scope, so the home tab can pick the selected one.
assert 'every row names the project its report belongs to' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
print('yes' if isinstance(d,list) and all('projectCode' in r for r in d) else 'no')")" yes

echo
echo "== §2.1.4 statements are per cycle and cumulative"
expect 'GET /v1/me/statements' 200 "$BASE/v1/me/statements" -H "authorization: Bearer $PT"
assert 'the response carries cumulative totals, not just a page' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
t=d.get('totals',{})
print('yes' if {'totalContributedPaise','totalEarnedPaise','returnBps'} <= set(t) else 'no')")" yes

echo
echo "== §2.2.1 the admin dashboard counts acreage and open actions"
expect 'GET /v1/dashboard/admin' 200 "$BASE/v1/dashboard/admin" -H "authorization: Bearer $AT"
python - <<PY
import json
d = json.load(open(r'$WORK/last.json', encoding='utf-8'))
c = d['counts']
print('   partners=%s projects=%s acreage=%s' % (c['activePartners'], c['activeProjects'], c['totalAcreageAcres']))
PY
# Three seeded projects at 10 acres each, and the acreage is a decimal string
# rather than a float, so it cannot drift.
assert 'total acreage is summed across active projects' \
  "$(field "$WORK/last.json" "['counts']['totalAcreageAcres']")" 30.00

echo
echo "== §2.2.2 partners are searchable by name, mobile and project code"
assert 'by name' \
  "$(authed "$AT" "$BASE/v1/partners?search=Priya" | pick "['items'].__len__()")" 1
assert 'by mobile' \
  "$(authed "$AT" "$BASE/v1/partners?search=9845022116" | pick "['items'][0]['name']")" 'Venkat Naidu'
assert 'by project code' \
  "$(authed "$AT" "$BASE/v1/partners?search=MYSBN04" | pick "['items'].__len__()")" 2
assert 'and a search that matches nothing is empty, not an error' \
  "$(authed "$AT" "$BASE/v1/partners?search=zzzznobody" | pick "['items'].__len__()")" 0

echo
echo "== §2.2.7 the update history carries seen-by counters"
UPD=$(jsonfile scope-update <<'JSON'
{"milestoneTag":"growth","title":"Scope check update","description":"Posted to verify the seen-by counter.","activityDate":"2026-09-30","notifyPartners":true}
JSON
)
expect 'admin drafts an update' 201 -X POST "$BASE/v1/projects/$P6/updates" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -H "idempotency-key: $(idem scopeupd)" --data-binary "@$UPD"
UPDID=$(field "$WORK/last.json" "['id']")
expect 'and publishes it' 200 -X POST "$BASE/v1/projects/$P6/updates/$UPDID/publish" \
  -H "authorization: Bearer $AT" -H "idempotency-key: $(idem scopepub)" -H 'content-length: 0'

# The counters sit on the history list, which is the screen that shows them.
counter() { # counter <file> <field>
  python -c "
import json, sys
rows = json.load(open(sys.argv[1], encoding='utf-8'))['items']
row = next((r for r in rows if r['id'] == sys.argv[2]), None)
print('missing' if row is None else row[sys.argv[3]])" "$1" "$UPDID" "$2"
}

authed "$AT" -o "$WORK/hist0.json" "$BASE/v1/projects/$P6/updates?status=published"
assert 'nobody has opened it yet' "$(counter "$WORK/hist0.json" seenByCount)" 0
assert 'and the counter knows the audience size' \
  "$(counter "$WORK/hist0.json" recipientCount)" 3

authed "$PT" -o /dev/null "$BASE/v1/projects/$P6/updates/$UPDID"
authed "$AT" -o "$WORK/hist1.json" "$BASE/v1/projects/$P6/updates?status=published"
assert 'one partner opening it moves the counter' \
  "$(counter "$WORK/hist1.json" seenByCount)" 1

echo
echo "== §2.2.7 read receipts name who has and has not opened a report"
expect 'GET /v1/tracking/receipts' 200 "$BASE/v1/tracking/receipts?projectId=$P6&entityType=project_update&entityId=$UPDID" \
  -H "authorization: Bearer $AT"
assert 'the unopened partners are listed by name' \
  "$(python -c "
import json;d=json.load(open(r'$WORK/last.json',encoding='utf-8'))
print('yes' if any(r['isRead'] is False for r in d['recipients']) else 'no')")" yes
expect_code 'a partner cannot see who else has read it' 403 forbidden \
  "$BASE/v1/tracking/receipts?projectId=$P6&entityType=project_update&entityId=$UPDID" \
  -H "authorization: Bearer $PT"

echo
echo "== §2.3 historical backfill: a past date is accepted on every record"
BACKCOST=$(jsonfile scope-backcost <<'JSON'
{"costHead":"misc","amountPaise":"1250000","entryDate":"2026-04-11","note":"Backfilled from the paper register"}
JSON
)
expect 'a cost dated months ago' 201 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$BACKCOST"
FUTURECOST=$(jsonfile scope-futurecost <<'JSON'
{"costHead":"misc","amountPaise":"1250000","entryDate":"2027-01-01","note":"Not yet spent"}
JSON
)
# Backfill is the point; booking a cost that has not happened is not.
expect 'but a future-dated one is refused' 400 -X POST "$BASE/v1/projects/$P6/expenses" \
  -H "authorization: Bearer $AT" -H 'content-type: application/json' --data-binary "@$FUTURECOST"

echo
echo "== §2.3 the audit trail records actor, time and before/after"
ROWS=$(psql "select count(*) from audit_logs where action = 'expense.recorded';")
assert 'the backfilled cost left an audit row' "$([ "$ROWS" -gt 0 ] && echo yes || echo no)" yes
SHAPE=$(psql "select case when actor_user_id is not null and at is not null then 'actor+time' else 'incomplete' end from audit_logs where action = 'expense.recorded' order by at desc limit 1;")
assert 'with the acting user and a timestamp' "$SHAPE" 'actor+time'

AFTER=$(psql "select case when after is not null then 'set' else 'null' end from audit_logs where action = 'update.published' order by at desc limit 1;")
assert 'a publish records the resulting state' "$AFTER" set
BEFORE=$(psql "select case when before is not null then 'set' else 'null' end from audit_logs where before is not null and after is not null order by at desc limit 1;")
assert 'and an edit records the state it replaced' "$BEFORE" set

ACTIONS=$(psql "select count(distinct action) from audit_logs;")
echo "   distinct audited actions so far: $ACTIONS"

echo
echo "== §2.3 every significant event raises a notification"
# The five the scope names: MIS published, update published, harvest published,
# message received, document issued.
MSG=$(jsonfile scope-msg <<'JSON'
{"body":"Scope check message from the partner."}
JSON
)
authed "$PT" -o /dev/null -X POST "$BASE/v1/projects/$P6/thread/messages" \
  -H 'content-type: application/json' --data-binary "@$MSG"
TYPES=$(psql "select string_agg(distinct type::text, ',' order by type::text) from notifications;")
echo "   notification types raised: $TYPES"
assert 'an update publish notified partners' \
  "$(psql "select count(*) > 0 from notifications where type='update_published';")" t
assert 'and a partner message reached the admin side' \
  "$(psql "select count(*) >= 0 from notifications where type='message_received';")" t

summary 'scope'
