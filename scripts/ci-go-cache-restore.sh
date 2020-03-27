#!/usr/bin/env bash

recentCacheBytes() {
  find $(go env GOCACHE) \
    -type f \
    -newer .git/HEAD \
    -exec du -k {} \; | cut -f1 | awk '{s+=$1} END {print s}'
}

recentCacheRestore() {
  echo "Restoring original Go build cache copy"
  rm -fr $(go env GOCACHE)
  tar -C / -xf /tmp/go-build-cache.tar
}

newBytes=$(recentCacheBytes)
if [ "$newBytes" == "" ]; then
  newBytes=0
fi

echo "Go build cache recent files size: $newBytes"
if [ $newBytes -lt 512 ]; then
  recentCacheRestore
fi
