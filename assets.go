package main

import (
	"bytes"
	"errors"
	"net/http"
	"strings"

	assetfs "github.com/elazarl/go-bindata-assetfs"
	"github.com/gin-gonic/gin"
)

type binaryFileSystem struct {
	fs http.FileSystem
}

func (b *binaryFileSystem) Open(name string) (http.File, error) {
	return b.fs.Open(name)
}

func (b *binaryFileSystem) Exists(prefix string, filepath string) bool {
	if p := strings.TrimPrefix(filepath, prefix); len(p) < len(filepath) {
		if _, err := b.fs.Open(p); err != nil {
			// file does not exist
			return false
		}
		// file exist
		return true
	}
	// file path doesn't start with fs prefix, so this file isn't stored here
	return false
}

func newBinaryFileSystem(root string) *binaryFileSystem {
	fs := &assetfs.AssetFS{
		Asset: Asset,
		// Don't render directory index, return 404 for /static/ requests)
		AssetDir: func(path string) ([]string, error) {
			return nil, errors.New("Not found")
		},
		Prefix: root,
	}
	return &binaryFileSystem{fs}
}

func responseFromStaticFile(c *gin.Context, filepath string, contentType string) {
	if !staticFileSystem.Exists("/", filepath) {
		c.String(404, "Not found")
		return
	}

	file, err := staticFileSystem.Open(filepath)
	if err != nil {
		c.AbortWithError(500, err)
		return
	}
	buf := bytes.NewBuffer(nil)
	_, err = buf.ReadFrom(file)
	if err != nil {
		c.AbortWithError(500, err)
		return
	}
	c.Data(200, contentType, buf.Bytes())
}
