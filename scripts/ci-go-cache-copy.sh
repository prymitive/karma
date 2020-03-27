#!/usr/bin/env bash

tar -cf /tmp/go-build-cache.tar $(go env GOCACHE)
