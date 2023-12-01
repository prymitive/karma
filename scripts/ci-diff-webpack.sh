#!/usr/bin/env bash

set -o errexit
set -o pipefail

git fetch origin main
git reset --hard FETCH_HEAD

make -C ui dist/stats.json
mv ui/dist/stats.json main.json

make clean
git reset --hard ${GITHUB_SHA}
make -C ui dist/stats.json

./scripts/cra-bundle-stats-diff.py main.json ui/dist/stats.json | tee diff.html
./scripts/pr-comment.py "Webpack bundle size diff" diff.html html
