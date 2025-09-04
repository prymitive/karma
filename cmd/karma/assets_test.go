package main

import (
	"fmt"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/prymitive/karma/internal/config"
)

type customizationAssetsTest struct {
	customJS  string
	customCSS string
	path      string
	body      string
	mime      string
	code      int
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
			body:     "PUBLIC_URL=.\nFAST_REFRESH=false\nSKIP_PREFLIGHT_CHECK=true\n",
			mime:     "application/javascript",
		},
		{
			customCSS: "../../ui/.env",
			path:      "/custom.css",
			code:      200,
			body:      "PUBLIC_URL=.\nFAST_REFRESH=false\nSKIP_PREFLIGHT_CHECK=true\n",
			mime:      "text/css",
		},
	}

	mockConfig(t.Setenv)
	for i, staticFileTest := range customizationAssetsTests {
		t.Run(fmt.Sprintf("%d/%s", i, staticFileTest.path), func(t *testing.T) {
			config.Config.Custom.CSS = staticFileTest.customCSS
			config.Config.Custom.JS = staticFileTest.customJS
			r := testRouter()
			setupRouter(r, nil)

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
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)

	req := httptest.NewRequest("GET", "/static/foobar.js", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Result().Header.Get("Expires") != "" {
		t.Errorf("Got Expires: '%s' header on a 404 /static/ response", resp.Result().Header.Get("Expires"))
	}
}

func TestAssetFallbackMIME(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/__test__/test.file", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != 200 {
		t.Errorf("Invalid status code for GET %s: %d", "/__test__/test.file", resp.Code)
	}
	if resp.Result().Header.Get("Content-Type") != "application/octet-stream" {
		t.Errorf("Invalid Content-Type for GET /__test__/test.file: %s, expected 'text/plain; charset=utf-8'", resp.Result().Header.Get("Content-Type"))
	}
}

func TestStaticFiles(t *testing.T) {
	type staticFileTestCase struct {
		path string
		mime string
		code int
	}

	staticFileTests := []staticFileTestCase{
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
		{
			path: "/static/",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
		{
			path: "/static/js/404.js",
			code: 404,
			mime: "text/plain; charset=utf-8",
		},
	}

	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
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
		mime string
		code int
	}

	staticFilePrefixTests := []staticFileTestCase{
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

	t.Setenv("LISTEN_PREFIX", "/sub")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
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
