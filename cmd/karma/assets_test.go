package main

import (
	"html/template"
	"net/http/httptest"
	"testing"

	"github.com/prymitive/karma/internal/config"

	log "github.com/sirupsen/logrus"
)

type customizationAssetsTest struct {
	customJS  string
	customCSS string
	path      string
	code      int
	body      string
	mime      string
}

func TestCustomizationAssets(t *testing.T) {
	customizationAssetsTests := []customizationAssetsTest{
		{
			path: "/custom.js",
			code: 200,
			body: "",
			mime: "application/javascript",
		},
		{
			path: "/custom.css",
			code: 200,
			body: "",
			mime: "text/css",
		},
		{
			customJS: "foo/bar/custom.js",
			path:     "/custom.js",
			code:     404,
			body:     "foo/bar/custom.js not found",
			mime:     "application/javascript",
		},
		{
			customCSS: "foo/bar/custom.css",
			path:      "/custom.css",
			code:      404,
			body:      "foo/bar/custom.css not found",
			mime:      "text/css",
		},
		{
			customJS: "../../ui/.env",
			path:     "/custom.js",
			code:     200,
			body:     "PUBLIC_URL=.\n",
			mime:     "text/plain; charset=utf-8",
		},
		{
			customCSS: "../../ui/.env",
			path:      "/custom.css",
			code:      200,
			body:      "PUBLIC_URL=.\n",
			mime:      "text/plain; charset=utf-8",
		},
	}

	mockConfig()
	for _, staticFileTest := range customizationAssetsTests {
		config.Config.Custom.CSS = staticFileTest.customCSS
		config.Config.Custom.JS = staticFileTest.customJS
		r := ginTestEngine()

		req := httptest.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
		if resp.Body.String() != staticFileTest.body {
			t.Errorf("Invalid body for GET %s: %s, expected %s", staticFileTest.path, resp.Body.String(), staticFileTest.body)
		}
		if resp.Result().Header.Get("Content-Type") != staticFileTest.mime {
			t.Errorf("Invalid Content-Type for GET %s: %s, expected %s", staticFileTest.path, resp.Result().Header.Get("Content-Type"), staticFileTest.mime)
		}
	}
}

func TestStaticExpires404(t *testing.T) {
	mockConfig()
	r := ginTestEngine()

	req := httptest.NewRequest("GET", "/static/foobar.js", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Result().Header.Get("Expires") != "" {
		t.Errorf("Got Expires: '%s' header on a 404 /static/ response", resp.Result().Header.Get("Expires"))
	}
}

func TestLoadTemplateChained(t *testing.T) {
	var tmpl *template.Template
	tmpl = loadTemplate(tmpl, "ui/build/index.html")
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}

	tmpl = loadTemplate(tmpl, "ui/build/favicon.ico")
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}

	if tmpl.Name() != "ui/build/index.html" {
		t.Errorf("tmpl.Name() returned %q", tmpl.Name())
	}
}

func TestLoadTemplateMissing(t *testing.T) {
	log.SetLevel(log.PanicLevel)
	defer func() { log.StandardLogger().ExitFunc = nil }()
	var wasFatal bool
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	loadTemplate(nil, "/this/file/does/not/exist")

	if !wasFatal {
		t.Error("loadTemplate() with invalid path didn't cause log.Fatal()")
	}
}

func TestLoadTemplateUnparsable(t *testing.T) {
	log.SetLevel(log.PanicLevel)
	defer func() { log.StandardLogger().ExitFunc = nil }()
	var wasFatal bool
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	loadTemplate(nil, "ui/build/go-test-invalid.html")

	if !wasFatal {
		t.Error("loadTemplate() with unparsable file didn't cause log.Fatal()")
	}
}
