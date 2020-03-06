#!/usr/bin/env bash

set -o errexit
set -o pipefail

trap cleanup INT

function cleanup() {
    rm -f coverage.txt coverage.out profile.out
    exit
}

echo "" > coverage.txt

PKGS=$(go list ./... | grep -vE 'prymitive/karma/internal/mapper/v017/(client|models)')
COVERPKG=$(echo "$PKGS" | tr '\n' ',')
for d in $PKGS; do
    (go test -coverprofile=profile.out -coverpkg="$COVERPKG" $d 2>&1 || exit 2) \
        | grep -v 'warning: no packages being tested depend on matches for pattern' \
        | sed s/'of statements in .*'/''/g
    if [ -f profile.out ]; then
        cat profile.out >> coverage.txt
        rm profile.out
    fi
done

echo "mode: set" > coverage.out
cat coverage.txt | grep -v "mode: set" | grep -vE '^$' | grep -vE '^github.com/prymitive/karma/cmd/karma/bindata_assetfs.go:' >> coverage.out
mv coverage.out coverage.txt
go tool cover -func coverage.txt | tail -n 1 | awk '{print $3}'
