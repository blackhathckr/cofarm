#!/usr/bin/env bash
# Runs every end-to-end flow against a freshly seeded database.
#
# Sections assert counts against the seed and the OTP challenge budget is
# per-window, so each section runs against its own freshly seeded database.
#
#   pnpm up                       # postgres + minio
#   bash docs/flows/all.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API_LOG=${API_LOG:-${TMPDIR:-/tmp}/cofarm-api.log}
BASE=${BASE:-http://localhost:4000}

echo "== resetting the database"
bash docs/flows/api.sh stop >/dev/null 2>&1
pnpm db:reset >/dev/null 2>&1 || { echo "   db:reset failed"; exit 1; }
pnpm db:migrate >/dev/null 2>&1 || { echo "   db:migrate failed"; exit 1; }
pnpm db:seed >/dev/null 2>&1 || { echo "   db:seed failed"; exit 1; }
echo "   schema recreated and seeded"

echo "== starting the api"
# A dropped schema invalidates the pool's cached enum type ids.
bash docs/flows/api.sh start >/dev/null || { tail -25 "$API_LOG"; exit 1; }
echo "   api ready"

SECTIONS=(smoke partners documents content money messaging dashboard account scope roles)
TOTAL_PASS=0
TOTAL_FAIL=0
RUN=()
SKIPPED=()

for section in "${SECTIONS[@]}"; do
  script="docs/flows/$section.sh"
  if [ ! -f "$script" ]; then
    SKIPPED+=("$section")
    continue
  fi
  printf '\n######## %s ########\n' "$section"
  # The API holds state keyed to the old rows: rate-limit buckets, armed jobs.
  if ! pnpm db:truncate >/dev/null 2>&1 || ! pnpm db:seed >/dev/null 2>&1     || ! bash docs/flows/api.sh restart >/dev/null 2>&1; then
    echo "   reseed failed"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    RUN+=("$section:0/1")
    continue
  fi
  out=$(bash "$script" 2>&1)
  printf '%s\n' "$out"
  line=$(printf '%s\n' "$out" | grep -E '^== .*: [0-9]+ passed' | tail -1)
  p=$(printf '%s' "$line" | sed -nE 's/.*: ([0-9]+) passed.*/\1/p')
  f=$(printf '%s' "$line" | sed -nE 's/.*passed, ([0-9]+) failed.*/\1/p')
  TOTAL_PASS=$((TOTAL_PASS + ${p:-0}))
  TOTAL_FAIL=$((TOTAL_FAIL + ${f:-0}))
  RUN+=("$section:${p:-0}/${f:-0}")
done

printf '\n================ end to end ================\n'
for entry in "${RUN[@]}"; do printf '  %-12s %s passed / %s failed\n' "${entry%%:*}" "$(echo "${entry#*:}" | cut -d/ -f1)" "$(echo "${entry#*:}" | cut -d/ -f2)"; done
if [ ${#SKIPPED[@]} -gt 0 ]; then printf '  not yet written: %s\n' "${SKIPPED[*]}"; fi
printf '  TOTAL %d passed, %d failed\n' "$TOTAL_PASS" "$TOTAL_FAIL"
[ "$TOTAL_FAIL" -eq 0 ]
