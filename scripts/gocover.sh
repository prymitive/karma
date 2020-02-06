#!/usr/bin/env bash

set -e

echo "" > coverage.txt

for d in $(go list ./... | grep -v github.com/prymitive/karma/internal/mapper); do
    go test \
        -coverprofile=profile.out \
        -coverpkg=$(go list ./... | grep -v github.com/prymitive/karma/internal/mapper | tr '\n' ',') \
        $d 2>&1 | grep -v 'warning: no packages being tested depend on matches for pattern'
    if [ -f profile.out ]; then
        cat profile.out >> coverage.txt
        rm profile.out
    fi
done
