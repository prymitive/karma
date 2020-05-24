#!/usr/bin/env bash

set -o errexit
set -o pipefail


if [ "${TRAVIS_BRANCH}" == "master" ] && [ -n ${TRAVIS_COMMIT_RANGE} ]; then
  RANGE="${TRAVIS_COMMIT_RANGE}"
else
  git fetch origin master
  RANGE="FETCH_HEAD...${TRAVIS_COMMIT}"
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
