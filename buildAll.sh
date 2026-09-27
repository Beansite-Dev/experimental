#!/usr/bin/env bash
# this is assuming that zoxide is installed
# https://github.com/ajeetdsouza/zoxide

set -e

for dir in mb-fs2 mb-shell; do
  echo "Building $dir..."
  pushd "$dir" > /dev/null
  pnpm i && pnpm build
  popd > /dev/null
done

echo "finished!"