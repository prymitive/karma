package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/prymitive/karma/internal/config"

	log "github.com/sirupsen/logrus"
)

func TestLogConfig(t *testing.T) {
	logLevels := map[string]log.Level{
		"debug":   log.DebugLevel,
		"info":    log.InfoLevel,
		"warning": log.WarnLevel,
		"error":   log.ErrorLevel,
		"fatal":   log.FatalLevel,
		"panic":   log.PanicLevel,
	}

	for val, level := range logLevels {
		config.Config.Log.Level = val
		err := setupLogger()
		if err != nil {
			t.Error(err)
		}
		if log.GetLevel() != level {
			t.Errorf("Config.Log.Level=%s resulted in invalid log level %s", val, log.GetLevel())
		}
	}
}

func TestMetrics(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	setupMetrics(r)
	req := httptest.NewRequest("GET", "/metrics", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /metrics returned status %d", resp.Code)
	}
	body := resp.Body.String()
	for _, s := range []string{
		"karma_collected_alerts_count",
		"karma_collected_alerts_count",
		"karma_collect_cycles_total",
		"karma_alertmanager_errors_total",
	} {
		if !strings.Contains(body, s) {
			t.Errorf("Metric '%s' missing from /metrics response", s)
		}
	}
}
