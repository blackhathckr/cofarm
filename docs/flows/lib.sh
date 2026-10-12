# Shared helpers for the end-to-end flow scripts.
#
# Bodies are written to files and sent with --data-binary rather than inline:
# a multi-byte character in an inline -d makes curl miscount Content-Length,
# which the API then rejects as a malformed body.
set -uo pipefail

BASE=${BASE:-http://localhost:4000}
# A mixed path (C:/...) so the shell, the Windows curl binary and python all
# resolve it the same way. Git Bash's /tmp is not the same directory a Windows
# process sees.
if [ -z "${WORK:-}" ]; then
  if command -v cygpath >/dev/null 2>&1; then
    WORK="$(cygpath -m "${TEMP:-/tmp}")/cofarm-flows"
  else
    WORK="${TMPDIR:-/tmp}/cofarm-flows"
  fi
fi
mkdir -p "$WORK"

PASS=0
FAIL=0
FAILED_NAMES=()

jsonfile() { # jsonfile <name> <<<'{...}'  -> prints the path
  local path="$WORK/$1.json"
  cat >"$path"
  printf '%s' "$path"
}

pick() { python -c "import sys,json;print(json.load(sys.stdin)$1)" 2>/dev/null; }
field() { python -c "import sys,json;print(json.load(open(sys.argv[1],encoding='utf-8'))$2)" "$1" "$2" 2>/dev/null; }

ok() {
  printf '  ok    %-62s %s\n' "$1" "${2:-}"
  PASS=$((PASS + 1))
}

bad() {
  printf '  FAIL  %-62s %s\n' "$1" "${2:-}"
  FAIL=$((FAIL + 1))
  FAILED_NAMES+=("$1")
}

# expect <label> <wanted-status> <curl args...>
expect() {
  local label=$1 want=$2
  shift 2
  local got
  got=$(curl -s -o "$WORK/last.json" -w '%{http_code}' "$@")
  if [ "$got" = "$want" ]; then ok "$label" "$got"; else bad "$label" "got $got want $want"; fi
}

# expect_code <label> <wanted-status> <wanted-error-code> <curl args...>
# Checks the problem+json `code`, not just the status — the code is what clients
# branch on, so a right status with the wrong code is still a defect.
expect_code() {
  local label=$1 want=$2 wantCode=$3
  shift 3
  local got code
  got=$(curl -s -o "$WORK/last.json" -w '%{http_code}' "$@")
  code=$(field "$WORK/last.json" "['code']")
  if [ "$got" = "$want" ] && [ "$code" = "$wantCode" ]; then
    ok "$label" "$got $code"
  else
    bad "$label" "got $got/$code want $want/$wantCode"
  fi
}

# assert <label> <actual> <expected>
assert() {
  if [ "$2" = "$3" ]; then ok "$1" "$2"; else bad "$1" "got '$2' want '$3'"; fi
}

authed() { # authed <token> <curl args...>
  local token=$1
  shift
  curl -s -H "authorization: Bearer $token" "$@"
}

admin_token() {
  local body
  body=$(jsonfile admin-login <<'JSON'
{"email":"admin@cofarm.local","password":"cofarm-dev-admin"}
JSON
)
  curl -s -X POST "$BASE/v1/auth/admin/login" -H 'content-type: application/json' \
    --data-binary "@$body" | pick "['accessToken']"
}

as_admin() { # as_admin <email> <password>  -> access token
  local body
  body=$(printf '{"email":"%s","password":"%s"}' "$1" "$2" | jsonfile "login-$1")
  curl -s -X POST "$BASE/v1/auth/admin/login" -H 'content-type: application/json'     --data-binary "@$body" | pick "['accessToken']"
}

partner_token() { # partner_token <+91mobile>
  local mobile=$1 body challenge
  body=$(printf '{"mobile":"%s"}' "$mobile" | jsonfile "otp-$mobile")
  challenge=$(curl -s -X POST "$BASE/v1/auth/partner/otp" -H 'content-type: application/json' \
    --data-binary "@$body" | pick "['challengeId']")
  body=$(printf '{"challengeId":"%s","code":"000000"}' "$challenge" | jsonfile "otpv-$mobile")
  curl -s -X POST "$BASE/v1/auth/partner/otp/verify" -H 'content-type: application/json' \
    --data-binary "@$body" | pick "['accessToken']"
}

project_id() { # project_id <token> <CODE>
  authed "$1" "$BASE/v1/projects?limit=50" | python -c "
import sys,json
code = sys.argv[1]
for p in json.load(sys.stdin)['items']:
    if p['code'] == code:
        print(p['id']); break
" "$2"
}

idem() { printf 'k-%s-%s' "$(date +%s)" "${1:-x}$RANDOM"; }

# Every run invents its own identities, so a script is re-runnable against a
# database that already holds the results of an earlier run.
RUN_ID=${RUN_ID:-$(date +%s)}

run_mobile() { # run_mobile <n>  -> a valid, run-unique +91 number
  printf '+919%08d%s' "$((RUN_ID % 100000000))" "${1:-0}"
}

run_email() { printf '%s-%s@example.test' "${1:-user}" "$RUN_ID"; }
run_slug() { printf '%s-%s' "${1:-item}" "$RUN_ID"; }

summary() { # summary <section name>
  printf '\n== %s: %d passed, %d failed\n' "$1" "$PASS" "$FAIL"
  if [ "$FAIL" -gt 0 ]; then
    printf '   failed:\n'
    for name in "${FAILED_NAMES[@]}"; do printf '     - %s\n' "$name"; done
  fi
  [ "$FAIL" -eq 0 ]
}
