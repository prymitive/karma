package main

import (
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
		setupLogger()
		if log.GetLevel() != level {
			t.Errorf("Config.Log.Level=%s resulted in invalid log level %s", val, log.GetLevel())
		}
	}
}
