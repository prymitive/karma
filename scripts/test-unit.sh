#!/usr/bin/env bash

set -o errexit
set -o pipefail

trap cleanup INT

function cleanup() {
    rm -f profile.*
    exit
}

PKGS=$(go list ./... | grep -vE 'prymitive/karma/internal/mapper/v017/(client|models)')
COVERPKG=$(echo "$PKGS" | tr '\n' ',')

I=0
for d in $PKGS; do
    I=$((I+1))
    COVFILE="profile.test.${I}"
    (go test -count=1 -coverprofile="${COVFILE}" -coverpkg="$COVERPKG" $d 2>&1 || exit 2) \
        | grep -v 'warning: no packages being tested depend on matches for pattern' \
        | sed s/'of statements in .*'/''/g
done
