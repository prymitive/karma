#!/usr/bin/env bash

set -o errexit
set -o pipefail

git fetch origin master
git reset --hard FETCH_HEAD

make benchmark-go | tee master.txt

git reset --hard ${TRAVIS_PULL_REQUEST_SHA}
make benchmark-go | tee new.txt

make benchmark-compare-go | tee benchstat.txt
./scripts/pr-comment.py "Go benchmark diff" benchstat.txt noformat
