package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/log"
)

func TestLogConfig(t *testing.T) {
	logLevels := map[string]slog.Level{
		"debug":   slog.LevelDebug,
		"info":    slog.LevelInfo,
		"warning": slog.LevelWarn,
		"error":   slog.LevelError,
	}

	for val, level := range logLevels {
		config.Config.Log.Format = "text"
		config.Config.Log.Level = val
		err := setupLogger()
		if err != nil {
			t.Error(err)
		}
		if log.Level.Level() != level {
			t.Errorf("Config.Log.Level=%s resulted in invalid log level %s", val, log.Level.Level())
		}
	}
}

func TestMetrics(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/metrics", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /metrics returned status %d", resp.Code)
	}
	body := resp.Body.String()
	for _, s := range []string{
		"karma_collected_alerts_count",
		"karma_collect_cycles_total",
		"karma_alertmanager_errors_total",
	} {
		if !strings.Contains(body, s) {
			t.Errorf("Metric '%s' missing from /metrics response:\n%s", s, body)
		}
	}
}

func TestGetViewURL(t *testing.T) {
	type testCaseT struct {
		prefix string
		view   string
		result string
	}
	tests := []testCaseT{
		{
			prefix: "",
			view:   "/",
			result: "/",
		},
		{
			prefix: "",
			view:   "foo",
			result: "/foo",
		},
		{
			prefix: "root",
			view:   "foo",
			result: "/root/foo",
		},
		{
			prefix: "root",
			view:   "foo/",
			result: "/root/foo/",
		},
		{
			prefix: "/root",
			view:   "foo",
			result: "/root/foo",
		},
		{
			prefix: "root/",
			view:   "foo",
			result: "/root/foo",
		},
		{
			prefix: "root/",
			view:   "foo/",
			result: "/root/foo/",
		},
		{
			prefix: "/root/",
			view:   "foo",
			result: "/root/foo",
		},
		{
			prefix: "/root/",
			view:   "/foo/",
			result: "/root/foo/",
		},
	}

	for _, testCase := range tests {
		t.Run(fmt.Sprintf("prefix=%q view=%v result=%q", testCase.prefix, testCase.view, testCase.result), func(t *testing.T) {
			config.Config.Listen.Prefix = testCase.prefix
			result := getViewURL(testCase.view)
			if result != testCase.result {
				t.Errorf("getViewURL(%s) returned %q, expected %q", testCase.view, result, testCase.result)
			}
		})
	}
}
