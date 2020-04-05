#!/usr/bin/env bash

set -o errexit
set -o pipefail

gocovmerge profile.* | grep -vE '^github.com/prymitive/karma/cmd/karma/bindata_assetfs.go:' > coverage.txt
rm -f profile.*

go tool cover -func coverage.txt | tail -n 1 | awk '{print $3}'
