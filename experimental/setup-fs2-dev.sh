#!/bin/bash
set -m
ROOT=$(cd "$(dirname "$0")" && pwd)
LIB="$ROOT/mb-fs2"
TEST="$ROOT/mb-fs2-test"
MARKER=$(mktemp)
DEV_PID=

build() {
  echo "building filesystem"
  (cd "$LIB" && pnpm build)
}

start_dev() {
  echo "starting dev server"
  (cd "$TEST" && exec pnpm dev) &
  DEV_PID=$!
}

stop_dev() {
  if [ -n "$DEV_PID" ]; then
    kill -- -"$DEV_PID" 2>/dev/null
    wait "$DEV_PID" 2>/dev/null
    DEV_PID=
  fi
}

rebuild() {
  touch "$MARKER"
  if build; then
    stop_dev
    start_dev
  else
    echo "build failed, waiting for changes"
  fi
}

cleanup() {
  stop_dev
  rm -f "$MARKER"
}

trap cleanup EXIT
trap exit INT TERM

rebuild
echo "watching mb-fs2 for changes (ctrl+c to quit)"

while true; do
  sleep 1
  CHANGED=$(find "$LIB" \( -name node_modules -o -name dist -o -name .git \) -prune -o -type f -newer "$MARKER" -print -quit)
  if [ -n "$CHANGED" ]; then
    echo "change detected: ${CHANGED#$LIB/}"
    rebuild
  fi
done