package main

import (
	"net/http/httptest"
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
			customJS: "ui/.env",
			path:     "/custom.js",
			code:     200,
			body:     "NODE_PATH=src\nPUBLIC_URL=.\n",
			mime:     "text/plain; charset=utf-8",
		},
		{
			customCSS: "ui/.env",
			path:      "/custom.css",
			code:      200,
			body:      "NODE_PATH=src\nPUBLIC_URL=.\n",
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
