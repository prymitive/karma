#!/usr/bin/env bash

set -o errexit
set -o pipefail

git fetch origin master
git reset --hard FETCH_HEAD

make -C ui build/stats.json
mv ui/build/stats.json master.json

make clean
git reset --hard ${TRAVIS_PULL_REQUEST_SHA}
make -C ui build/stats.json

./scripts/cra-bundle-stats-diff.py master.json ui/build/stats.json | tee diff.html
./scripts/pr-comment.py "Webpack bundle size diff" diff.html html
