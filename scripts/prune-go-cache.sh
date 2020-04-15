#!/usr/bin/env bash

set -o errexit
set -o pipefail


DRY_RUN="$1"

GOCACHE=$(go env GOCACHE)
SIZE=`du -sxm ${GOCACHE} | awk '{print $1}'`
echo "GOCACHE size: ${SIZE}MB"

if [ "${DRY_RUN}" == "" ] && [ "${TRAVIS_BRANCH}" == "master" ] && [ $SIZE -gt 3500 ]; then
  echo "Pruning GOCACHE at ${GOCACHE}"
  find "${GOCACHE}" -type f -delete
fi
