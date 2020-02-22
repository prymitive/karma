package main

import (
	"os"
	"testing"

	"github.com/rogpeppe/go-internal/testscript"
	"github.com/spf13/pflag"

	log "github.com/sirupsen/logrus"
)

func mainShoulFail() int {
	var wasFatal bool
	defer func() {
		if r := recover(); r != nil {
			wasFatal = true
		}
	}()
	defer func() { log.StandardLogger().ExitFunc = nil }()
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	_, err := mainSetup(pflag.ContinueOnError)
	if err != nil {
		log.Error(err)
	} else if wasFatal {
		return 0
	} else {
		log.Error("No error logged")
		return 100
	}
	return 0
}

func mainShoulFailNoTimestamp() int {
	log.SetFormatter(&log.TextFormatter{
		DisableTimestamp: true,
	})
	return mainShoulFail()
}

func mainShouldWork() int {
	_, err := mainSetup(pflag.ContinueOnError)
	if err != nil {
		log.Error(err)
		return 100
	}
	return 0
}

func TestMain(m *testing.M) {
	os.Exit(testscript.RunMain(m, map[string]func() int{
		"karma.bin-should-fail":              mainShoulFail,
		"karma.bin-should-fail-no-timestamp": mainShoulFailNoTimestamp,
		"karma.bin-should-work":              mainShouldWork,
	}))
}

func TestScripts(t *testing.T) {
	testscript.Run(t, testscript.Params{
		Dir: "tests/testscript",
	})
}
