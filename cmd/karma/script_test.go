package main

import (
	"os"
	"testing"

	"github.com/rogpeppe/go-internal/testscript"
	"github.com/spf13/pflag"

	log "github.com/sirupsen/logrus"
)

func mainShoulFail() int {
	err := serve(pflag.ContinueOnError)
	if err != nil {
		log.Error(err)
		return 0
	}
	log.Error("No error logged")
	return 100
}

func mainShoulFailNoTimestamp() int {
	log.SetFormatter(&log.TextFormatter{
		DisableTimestamp: true,
	})
	return mainShoulFail()
}

func mainShouldWork() int {
	err := serve(pflag.ContinueOnError)
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
