package main

import (
	"errors"
	"fmt"
	"strings"

	log "github.com/Sirupsen/logrus"
	assetfs "github.com/elazarl/go-bindata-assetfs"
	"html/template"
	"net/http"
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

// readAssets will read assets.txt file in given directory and return a list
// of file names in that file
// assets.txt contains a list of external js of css files that are mirrored
// in static/assets directory that should be loaded in the browser
// this way we don't have to maintain this list in the Makefile that does
// the mirroring and in the template
func readAssets(kind string) []string {
	indexPath := fmt.Sprintf("static/managed/%s/assets.txt", kind)
	assetIndex, err := Asset(indexPath)
	if err != nil {
		log.Error(err)
		return []string{}
	}
	ret := []string{}
	for _, l := range strings.Split(string(assetIndex), "\n") {
		if l != "" {
			ret = append(ret, l)
		}
	}
	return ret
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
