package main

import (
	"io"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/prymitive/karma/ui"
)

func contentText(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
}

func serveFileOr404(path, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
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

			slog.Debug(
				"Static file request",
				slog.String("path", r.URL.Path),
				slog.String("root", root),
				slog.String("prefix", prefix),
				slog.String("filePath", filePath),
			)

			if !strings.HasPrefix(r.URL.Path, prefix) {
				slog.Debug("Ignoring static file request", slog.String("path", r.URL.Path), slog.String("prefix", prefix))
				next.ServeHTTP(w, r)
				return
			}

			fl, err := ui.StaticFiles.Open(filePath)
			if err != nil {
				slog.Debug("Static file not found", slog.String("path", r.URL.Path))
				next.ServeHTTP(w, r)
				return
			}
			defer fl.Close()
			slog.Debug("Static file found", slog.String("path", r.URL.Path))

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
