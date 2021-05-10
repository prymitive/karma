#!/usr/bin/env bash

set -o errexit
set -o pipefail


if [ "${GITHUB_HEAD_REF_SLUG}" == "main" ]; then
  RANGE="HEAD~.."
else
  git fetch origin main
  RANGE="FETCH_HEAD...${GITHUB_SHA}"
fi


git log --no-merges --name-only --pretty=format: ${RANGE} | grep -Ev '^$' | sort | uniq | while read FILE ; do
  if [[ "${FILE}" =~ ^ui/src/.+ ]]; then
    echo "[P] ${FILE}"
    exit 1
  elif [[ "${FILE}" =~ ^ui/.storybook/.+ ]]; then
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
