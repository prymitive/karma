package main

import (
	"fmt"
	"html/template"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gobuffalo/packr/v2"

	log "github.com/sirupsen/logrus"
)

// load a template from binary asset resource
func loadTemplate(t *template.Template, path string, box *packr.Box) *template.Template {
	templateContent, err := box.Find(path)
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

func tryBoxFile(prefix string, box *packr.Box) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, prefix) {
			log.Debugf("Looking up asset file for %q under prefix %q: prefix mismatch", c.Request.URL.Path, prefix)
			c.Next()
			return
		}

		filePath := strings.TrimPrefix(c.Request.URL.Path, prefix)
		data, err := box.Find(filePath)
		if err != nil {
			log.Debugf("Looking up asset file for %q under prefix %q as %q raised 404", c.Request.URL.Path, prefix, filePath)
			c.Next()
			return
		}
		contentType := mime.TypeByExtension(filepath.Ext(c.Request.URL.Path))
		if contentType == "" {
			contentType = "text/plain; charset=utf-8"
		}
		log.Debugf("Looking up asset file for %q under prefix %q as %q raised 200 as %q", c.Request.URL.Path, prefix, filePath, contentType)
		c.Data(200, contentType, data)
		c.Abort()
	}
}
