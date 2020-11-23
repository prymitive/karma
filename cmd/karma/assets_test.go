package main

import (
	"fmt"
	"html/template"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/prymitive/karma/internal/config"
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
			body:     "open foo/bar/custom.js: no such file or directory",
			mime:     "text/plain; charset=utf-8",
		},
		{
			customCSS: "foo/bar/custom.css",
			path:      "/custom.css",
			code:      404,
			body:      "open foo/bar/custom.css: no such file or directory",
			mime:      "text/plain; charset=utf-8",
		},
		{
			customJS: "../../ui/.env",
			path:     "/custom.js",
			code:     200,
			body:     "PUBLIC_URL=.\nFAST_REFRESH=false\n",
			mime:     "application/javascript",
		},
		{
			customCSS: "../../ui/.env",
			path:      "/custom.css",
			code:      200,
			body:      "PUBLIC_URL=.\nFAST_REFRESH=false\n",
			mime:      "text/css",
		},
	}

	mockConfig()
	for i, staticFileTest := range customizationAssetsTests {
		t.Run(fmt.Sprintf("%d/%s", i, staticFileTest.path), func(t *testing.T) {
			config.Config.Custom.CSS = staticFileTest.customCSS
			config.Config.Custom.JS = staticFileTest.customJS
			r := testRouter()
			setupRouter(r)

			req := httptest.NewRequest("GET", staticFileTest.path, nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != staticFileTest.code {
				t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
			}
			if resp.Body.String() != staticFileTest.body {
				t.Errorf("Invalid body for GET %s: %s, expected %s", staticFileTest.path, resp.Body.String(), staticFileTest.body)
			}
			if resp.Result().Header.Get("Cache-Control") != "no-cache, no-store, must-revalidate" {
				t.Errorf("Invalid Cache-Control for GET %s: %s, expected %s", staticFileTest.path, resp.Result().Header.Get("Cache-Control"), "no-cache, no-store, must-revalidate")
			}
			if resp.Result().Header.Get("Content-Type") != staticFileTest.mime {
				t.Errorf("Invalid Content-Type for GET %s: %s, expected %s", staticFileTest.path, resp.Result().Header.Get("Content-Type"), staticFileTest.mime)
			}
		})
	}
}

func TestStaticExpires404(t *testing.T) {
	mockConfig()
	r := testRouter()
	setupRouter(r)

	req := httptest.NewRequest("GET", "/static/foobar.js", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Result().Header.Get("Expires") != "" {
		t.Errorf("Got Expires: '%s' header on a 404 /static/ response", resp.Result().Header.Get("Expires"))
	}
}

func TestLoadTemplateChained(t *testing.T) {
	var tmpl *template.Template
	tmpl, err := loadTemplate(tmpl, "ui/build/index.html")
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}
	if err != nil {
		t.Errorf("loadTemplate returned error: %s", err)
	}

	tmpl, err = loadTemplate(tmpl, "ui/build/manifest.json")
	if tmpl == nil {
		t.Errorf("loadTemplate returned nil")
	}
	if err != nil {
		t.Errorf("loadTemplate returned error: %s", err)
	}

	if tmpl.Name() != "ui/build/index.html" {
		t.Errorf("tmpl.Name() returned %q", tmpl.Name())
	}
}

func TestLoadTemplateMissing(t *testing.T) {
	_, err := loadTemplate(nil, "/this/file/does/not/exist")
	if err == nil {
		t.Error("loadTemplate() with invalid path didn't return any error")
	}
}

func TestLoadTemplateUnparsable(t *testing.T) {
	_, err := loadTemplate(nil, "cmd/karma/tests/bindata/go-test-invalid.html")
	if err == nil {
		t.Error("loadTemplate() with unparsable file didn't return any error")
	}
}

func TestAssetFallbackMIME(t *testing.T) {
	mockConfig()
	r := testRouter()
	r.Use(serverStaticFiles(getViewURL("/"), newBinaryFileSystem("cmd/karma/tests/bindata")))
	setupRouter(r)
	req := httptest.NewRequest("GET", "/bin.data", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != 200 {
		t.Errorf("Invalid status code for GET %s: %d", "/bin.data", resp.Code)
	}
	if resp.Result().Header.Get("Content-Type") != "application/octet-stream" {
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
	r := testRouter()
	setupRouter(r)
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
	r := testRouter()
	setupRouter(r)
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
