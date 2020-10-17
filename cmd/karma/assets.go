package main

import (
	"errors"
	"html/template"
	"io"
	"io/ioutil"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	assetfs "github.com/elazarl/go-bindata-assetfs"
)

type binaryFileSystem struct {
	fs http.FileSystem
}

func (b *binaryFileSystem) Open(name string) (http.File, error) {
	return b.fs.Open(name)
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
func loadTemplate(t *template.Template, path string) (*template.Template, error) {
	templateContent, err := Asset(path)
	if err != nil {
		return nil, err
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
		return nil, err
	}

	return t, nil
}

func contentText(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
}

func serveFileOr404(path string, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		if path == "" {
			w.Header().Set("Content-Type", contentType)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte{})
			return
		}
		data, err := ioutil.ReadFile(path)
		if err != nil {
			contentText(w)
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(err.Error()))
			return
		}
		w.Header().Set("Content-Type", contentType)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	}
}

func serverStaticFiles(prefix string, fs *binaryFileSystem) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, prefix) {
				next.ServeHTTP(w, r)
				return
			}

			path := strings.TrimPrefix(r.URL.Path, prefix)
			fl, err := fs.Open(path)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			defer fl.Close()

			ct := mime.TypeByExtension(filepath.Ext(path))
			if ct == "" {
				ct = "application/octet-stream"
			}

			w.Header().Set("Content-Type", ct)
			w.WriteHeader(http.StatusOK)
			_, _ = io.Copy(w, fl)
		})
	}
}

func setStaticHeaders(prefix string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, prefix) {
				w.Header().Set("Cache-Control", "public, max-age=31536000")
				expiresTime := time.Now().AddDate(0, 0, 365).Format(http.TimeFormat)
				w.Header().Set("Expires", expiresTime)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clearStaticHeaders(prefix string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, prefix) {
				w.Header().Del("Cache-Control")
				w.Header().Del("Expires")

			}
			next.ServeHTTP(w, r)
		})
	}
}
