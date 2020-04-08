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
  if [[ "${FILE}" =~ ^ui/src/.+ ]]; then
    echo "[P] ${FILE}"
    exit 1
  elif [[ "${FILE}" == "ui/package.json" ]]; then
    echo "[?] ${FILE}"
    git diff --no-prefix --diff-filter=M --unified=0 ${RANGE} -- ui/package.json | grep -E '^\+ ' | tr -d '":,' | while read I NAME VERSION ; do
      if [[ "${NAME}" =~ ^(@types|@sentry)/.+ ]]; then
        echo "[S] ${NAME}: ${VERSION}"
      else
        echo "[P] ${NAME}: ${VERSION}"
        exit 1
      fi
    done
  else
    echo "[ ] ${FILE}"
  fi
done

exit 0
