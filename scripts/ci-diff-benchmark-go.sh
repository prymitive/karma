#!/usr/bin/env bash

set -o errexit
set -o pipefail

git fetch origin master
git reset --hard FETCH_HEAD
make benchmark-go | tee master.txt
git checkout -f ${TRAVIS_COMMIT}
make benchmark-go | tee new.txt
make benchmark-compare-go | tee benchstat.txt
./scripts/pr-comment.py "Go benchmark diff" benchstat.txt noformat
