package main

import (
	"os"
	"testing"

	"github.com/rogpeppe/go-internal/testscript"

	log "github.com/sirupsen/logrus"
)

func mainShoulFail() int {
	_, err := mainSetup()
	if err != nil {
		log.Error(err)
	} else {
		log.Error("No error logged")
		return 100
	}
	return 0
}

func mainShouldWork() int {
	_, err := mainSetup()
	if err != nil {
		log.Error(err)
		return 100
	}
	return 0
}

func TestMain(m *testing.M) {
	os.Exit(testscript.RunMain(m, map[string]func() int{
		"karma.bin-should-fail": mainShoulFail,
		"karma.bin-should-work": mainShouldWork,
	}))
}

func TestScripts(t *testing.T) {
	testscript.Run(t, testscript.Params{
		Dir: "testdata",
	})
}
