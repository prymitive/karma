package main

import (
	"html/template"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gobuffalo/packr/v2"
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
	tmpl = loadTemplate(tmpl, "index.html", staticBuildFileSystem)
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}

	tmpl = loadTemplate(tmpl, "favicon.ico", staticBuildFileSystem)
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}

	if tmpl.Name() != "index.html" {
		t.Errorf("tmpl.Name() returned %q", tmpl.Name())
	}
}

func TestLoadTemplateMissing(t *testing.T) {
	log.SetLevel(log.PanicLevel)
	defer func() { log.StandardLogger().ExitFunc = nil }()
	var wasFatal bool
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	loadTemplate(nil, "/this/file/does/not/exist", staticBuildFileSystem)

	if !wasFatal {
		t.Error("loadTemplate() with invalid path didn't cause log.Fatal()")
	}
}

func TestLoadTemplateUnparsable(t *testing.T) {
	log.SetLevel(log.PanicLevel)
	defer func() { log.StandardLogger().ExitFunc = nil }()
	var wasFatal bool
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	staticTestFileSystem := packr.New("tests/bindata", "./tests/bindata")
	loadTemplate(nil, "go-test-invalid.html", staticTestFileSystem)

	if !wasFatal {
		t.Error("loadTemplate() with unparsable file didn't cause log.Fatal()")
	}
}

func TestAssetFallbackMIME(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	r.Use(tryBoxFile("", packr.New("tests/bindata", "./tests/bindata")))
	req := httptest.NewRequest("GET", "/bin.data", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != 200 {
		t.Errorf("Invalid status code for GET %s: %d", "/bin.data", resp.Code)
	}
	if resp.Result().Header.Get("Content-Type") != "text/plain; charset=utf-8" {
		t.Errorf("Invalid Content-Type for GET /bin.data: %s, expected 'text/plain; charset=utf-8'", resp.Result().Header.Get("Content-Type"))
	}
}

func TestStaticFiles(t *testing.T) {
	type staticFileTestCase struct {
		path string
		code int
		mime string
	}

	var staticFileTests = []staticFileTestCase{
		{
			path: "/favicon.ico",
			code: 200,
			mime: "image/x-icon",
		},
		{
			path: "/manifest.json",
			code: 200,
			mime: "application/json",
		},
		{
			path: "/index.xml",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/xxx",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/static/abcd",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
	}

	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFileTests {
		req := httptest.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
		if resp.Result().Header.Get("Content-Type") != staticFileTest.mime {
			t.Errorf("Invalid Content-Type for GET %s: %s, expected %s", staticFileTest.path, resp.Result().Header.Get("Content-Type"), staticFileTest.mime)
		}
	}
}

func TestStaticFilesPrefix(t *testing.T) {
	type staticFileTestCase struct {
		path string
		code int
		mime string
	}

	var staticFilePrefixTests = []staticFileTestCase{
		{
			path: "/sub/favicon.ico",
			code: 200,
			mime: "image/x-icon",
		},
		{
			path: "/favicon.ico",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/sub/sub/favicon.ico",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/sub/manifest.json",
			code: 200,
			mime: "application/json",
		},
		{
			path: "/sub/index.xml",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/sub/xxx",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/sub/static/abcd",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
	}

	os.Setenv("LISTEN_PREFIX", "/sub")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFilePrefixTests {
		req := httptest.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
		if resp.Result().Header.Get("Content-Type") != staticFileTest.mime {
			t.Errorf("Invalid Content-Type for GET %s: %q, expected %q", staticFileTest.path, resp.Result().Header.Get("Content-Type"), staticFileTest.mime)
		}
	}
}
