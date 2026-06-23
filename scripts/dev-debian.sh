#!/usr/bin/env bash
set -euo pipefail

if ! command -v pnpm >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Error: pnpm is not installed or is not on PATH.
Install it with Corepack (recommended):
  corepack enable
  corepack prepare pnpm@latest --activate
Then rerun:
  pnpm run dev
MSG
  exit 1
fi

export API_PORT="${API_PORT:-5000}"
export WEB_PORT="${WEB_PORT:-5173}"
export BASE_PATH="${BASE_PATH:-/}"

api_pid=""
web_pid=""

cleanup() {
  local exit_code=$?

  trap - INT TERM EXIT

  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" >/dev/null 2>&1; then
    kill "${api_pid}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" >/dev/null 2>&1; then
    kill "${web_pid}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${api_pid}" ]]; then
    wait "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${web_pid}" ]]; then
    wait "${web_pid}" 2>/dev/null || true
  fi

  exit "${exit_code}"
}

trap cleanup INT TERM EXIT

PORT="${API_PORT}" pnpm --filter @workspace/api-server run dev &
api_pid=$!

PORT="${WEB_PORT}" BASE_PATH="${BASE_PATH}" pnpm --filter @workspace/pdf-map run dev &
web_pid=$!

printf 'Frontend: http://localhost:%s%s\n' "${WEB_PORT}" "${BASE_PATH}"
printf 'Backend health: http://localhost:%s/api/healthz\n' "${API_PORT}"
printf 'Press Ctrl+C to stop both dev servers.\n'

wait -n "${api_pid}" "${web_pid}"
