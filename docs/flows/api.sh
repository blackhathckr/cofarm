#!/usr/bin/env bash
# Start, stop or restart the API reliably.
#
#   bash docs/flows/api.sh restart
#
# Port ownership comes from Get-NetTCPConnection rather than parsing netstat:
# a missed PID leaves the old build listening and the next start dies with
# EADDRINUSE, which is slow to recognise because the failure looks like a hang.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PORT=${API_PORT:-4000}
API_LOG=${API_LOG:-${TMPDIR:-/tmp}/cofarm-api.log}

port_pids() {
  powershell -NoProfile -Command \
    "Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess" \
    2>/dev/null | tr -d '\r' | grep -E '^[0-9]+$' || true
}

api_stop() {
  local pids
  pids=$(port_pids)
  for pid in $pids; do
    taskkill //PID "$pid" //F >/dev/null 2>&1 || kill -9 "$pid" 2>/dev/null
  done
  for _ in $(seq 1 20); do
    [ -z "$(port_pids)" ] && return 0
    sleep 1
  done
  echo "port $PORT is still held by: $(port_pids)" >&2
  return 1
}

api_start() {
  if [ -n "$(port_pids)" ]; then
    echo "port $PORT already in use by $(port_pids) — stop it first" >&2
    return 1
  fi
  nohup pnpm --filter @cofarm/api start >"$API_LOG" 2>&1 &
  for _ in $(seq 1 40); do
    if curl -s --max-time 2 "http://localhost:$PORT/health/ready" | grep -q '"database":"up"'; then
      return 0
    fi
    sleep 1
  done
  echo "api did not become ready; last log lines:" >&2
  tail -25 "$API_LOG" >&2
  return 1
}

case "${1:-restart}" in
  stop) api_stop && echo "stopped" ;;
  start) api_start && echo "ready" ;;
  restart) api_stop && api_start && echo "ready" ;;
  pids) port_pids ;;
  *) echo "usage: $0 {start|stop|restart|pids}" >&2; exit 2 ;;
esac
