#!/usr/bin/env bash

set -o errexit
set -o pipefail


GOCACHE=$(go env GOCACHE)
SIZE=`du -sxm ${GOCACHE} | awk '{print $1}'`
echo "GOCACHE size: ${SIZE}MB"

if [ $SIZE -gt 3500 ]; then
  echo "Pruning GOCACHE at ${GOCACHE}"
  find "${GOCACHE}" -type f -delete
fi
