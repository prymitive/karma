// +build tools

# https://github.com/golang/go/issues/25922#issuecomment-412992431
# this file is to track dev dependencies for go modules that are needed
# to build this project, but are only CLI tools and don't get imported

package tools

import (
        _ "github.com/elazarl/go-bindata-assetfs"
        _ "github.com/terinjokes/bakelite"
        _ "github.com/golangci/golangci-lint/pkg/commands"
)
