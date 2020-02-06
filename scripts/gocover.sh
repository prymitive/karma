#!/usr/bin/env bash

set -e

echo "" > coverage.txt

for d in $(go list ./... | grep -vE 'prymitive/karma/internal/mapper/v017/(client|models)'); do
    go test \
        -coverprofile=profile.out \
        -coverpkg=$(go list ./... | grep -vE 'prymitive/karma/internal/mapper/v017/(client|models)' | tr '\n' ',') \
        $d 2>&1 | grep -v 'warning: no packages being tested depend on matches for pattern'
    if [ -f profile.out ]; then
        cat profile.out >> coverage.txt
        rm profile.out
    fi
done
