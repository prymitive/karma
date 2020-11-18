#!/usr/bin/env bash

set -o errexit
set -o pipefail


if [ "${GITHUB_HEAD_REF_SLUG}" == "master" ]; then
  RANGE="HEAD~.."
else
  git fetch origin master
  RANGE="FETCH_HEAD...${GITHUB_SHA}"
fi


git log --no-merges --name-only --pretty=format: ${RANGE} | grep -Ev '^$' | sort | uniq | while read FILE ; do
  if [[ "${FILE}" =~ ^ui/.+ ]]; then
    echo "[U] ${FILE}"
    exit 1
  else
    echo "[ ] ${FILE}"
  fi
done

exit 0
