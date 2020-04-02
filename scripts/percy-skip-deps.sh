#!/usr/bin/env bash

set -o errexit
set -o pipefail


git log --no-merges --name-only --pretty=format: ${1}..${2} | grep -Ev '^$' | sort | uniq | while read FILE ; do
  if [[ "${FILE}" =~ ^ui/src/.+ ]]; then
    echo "[P] ${FILE}"
    exit 1
  else
    echo "[ ] ${FILE}"
  fi
done

exit 0
