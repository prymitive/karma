#!/bin/bash -e

for I in ./cmd/karma/tests/testscript/*.txt ; do
    T=`basename "${I}" | cut -d. -f1`
    echo ">>> ${T}"
    go test -count=1 -timeout=30s -v -run=TestScript/${T} ./cmd/karma
done
