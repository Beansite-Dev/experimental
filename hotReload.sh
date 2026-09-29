#!/usr/bin/env bash
DIRS=("./mb-fs2" "./mb-shell")
[[ $# -gt 0 ]] && DIRS=("$@")
INTERVAL=2

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for i in "${!DIRS[@]}"; do
  [[ -d ${DIRS[$i]} ]] || { echo "not a directory: ${DIRS[$i]}"; exit 1; }
  touch "$TMP/$i"
done

echo "watching ${#DIRS[@]} dirs (Ctrl+C to stop)"
for d in "${DIRS[@]}"; do echo "  $d"; done

while true; do
  for i in "${!DIRS[@]}"; do
    d=${DIRS[$i]}
    changed=$(find "$d" \( -name node_modules -o -name dist -o -name .git \) -prune -o -type f -newer "$TMP/$i" -print -quit)
    if [[ -n $changed ]]; then
      echo "[$(date +%T)] change in $d ($changed)"
      touch "$TMP/$i"
      (cd "$d" && pnpm build) || echo "build failed in $d"
    fi
  done
  sleep "$INTERVAL"
done