package main

import (
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/prymitive/karma/ui"
	"github.com/rs/zerolog/log"
)

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
		data, err := os.ReadFile(path)
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

func serverStaticFiles(prefix, root string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fixedPath := strings.TrimPrefix(r.URL.Path, prefix)
			filePath := strings.TrimSuffix(root, "/") + "/" + strings.TrimPrefix(fixedPath, "/")

			log.Debug().Str("path", r.URL.Path).Str("root", root).Str("prefix", prefix).Str("filePath", filePath).Msg("Static file request")

			if !strings.HasPrefix(r.URL.Path, prefix) {
				log.Debug().Str("path", r.URL.Path).Str("prefix", prefix).Msg("Ignoring static file request")
				next.ServeHTTP(w, r)
				return
			}

			fl, err := ui.StaticFiles.Open(filePath)
			if err != nil {
				log.Debug().Str("path", r.URL.Path).Msg("Static file not found")
				next.ServeHTTP(w, r)
				return
			}
			defer fl.Close()
			log.Debug().Str("path", r.URL.Path).Msg("Static file found")

			ct := mime.TypeByExtension(filepath.Ext(filePath))
			if ct == "" {
				ct = "application/octet-stream"
			}
			w.Header().Set("Content-Type", ct)

			w.Header().Set("Cache-Control", "public, max-age=31536000")
			expiresTime := time.Now().AddDate(0, 0, 365).Format(http.TimeFormat)
			w.Header().Set("Expires", expiresTime)

			w.WriteHeader(http.StatusOK)
			_, _ = io.Copy(w, fl)
		})
	}
}
