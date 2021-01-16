#!/usr/bin/env bash

set -o errexit
set -o pipefail

git fetch origin main
git reset --hard FETCH_HEAD

make -C ui build/stats.json
mv ui/build/stats.json main.json

make clean
git reset --hard ${GITHUB_SHA}
make -C ui build/stats.json

./scripts/cra-bundle-stats-diff.py main.json ui/build/stats.json | tee diff.html
./scripts/pr-comment.py "Webpack bundle size diff" diff.html html
