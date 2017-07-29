package main

import (
	"errors"
	"html/template"
	"net/http"
	"strings"

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
			return false
		}
		return true
	}
	return false
}

func newBinaryFileSystem(root string) *binaryFileSystem {
	fs := &assetfs.AssetFS{
		Asset: Asset,
		// Don't render directory index, return 404 for /static/ requests)
		AssetDir: func(path string) ([]string, error) { return nil, errors.New("Not found") },
		Prefix:   root,
	}
	return &binaryFileSystem{
		fs,
	}
}

// load all templates from binary asset resource
// this function will iterate all files with given prefix (e.g. /templates/)
// and return Template instance with all templates loaded
func loadTemplates(prefix string) *template.Template {
	var t *template.Template
	for _, filename := range AssetNames() {
		if strings.HasPrefix(filename, prefix) {
			templateContent, err := Asset(filename)
			if err != nil {
				log.Fatal(err)
			}
			var tmpl *template.Template
			if t == nil {
				// if template wasn't yet initialized do it here
				t = template.New(filename)
			}
			if filename == t.Name() {
				tmpl = t
			} else {
				// if we already have an instance of template.Template then
				// add a new file to it
				tmpl = t.New(filename)
			}
			_, err = tmpl.Parse(string(templateContent))
			if err != nil {
				log.Fatal(err)
				return nil
			}
		}
	}
	return t
}
