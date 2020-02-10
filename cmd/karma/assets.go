package main

import (
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	assetfs "github.com/elazarl/go-bindata-assetfs"
	log "github.com/sirupsen/logrus"
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
			return nil, errors.New("not found")
		},
		Prefix: root,
	}
	return &binaryFileSystem{fs}
}

// load a template from binary asset resource
func loadTemplate(t *template.Template, path string) *template.Template {
	templateContent, err := Asset(path)
	if err != nil {
		log.Fatal(err)
	}

	var tmpl *template.Template
	if t == nil {
		// if template wasn't yet initialized do it here
		t = template.New(path)
	}

	if path == t.Name() {
		tmpl = t
	} else {
		// if we already have an instance of template.Template then
		// add a new file to it
		tmpl = t.New(path)
	}

	_, err = tmpl.Parse(string(templateContent))
	if err != nil {
		log.Fatal(err)
		return nil
	}

	return t
}

func serveFileOr404(path string, contentType string, c *gin.Context) {
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	if path == "" {
		c.Data(200, contentType, nil)
		return
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		c.Data(404, contentType, []byte(fmt.Sprintf("%s not found", path)))
		return
	}
	c.File(path)
}

func setStaticHeaders(prefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, prefix) {
			c.Header("Cache-Control", "public, max-age=31536000")
			expiresTime := time.Now().AddDate(0, 0, 365).Format(http.TimeFormat)
			c.Header("Expires", expiresTime)
			c.Next()
		}
	}
}

func clearStaticHeaders(prefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, prefix) {
			c.Header("Cache-Control", "")
			c.Header("Expires", "")
			c.Next()
		}
	}
}
