#!/usr/bin/env bash

set -o errexit
set -o pipefail

echo "mode: set" > coverage.txt
cat profile.* \
  | grep -v mode: \
  | sort -r \
  | awk '{if($1 != last) {print $0;last=$1}}' >> coverage.txt
rm -f profile.*

go tool cover -func coverage.txt | tail -n 1 | awk '{print $3}'
