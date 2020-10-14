package main

import (
	"os"
	"testing"

	"github.com/rogpeppe/go-internal/testscript"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
)

func mainShoulFail() int {
	initLogger()
	err := serve(pflag.ContinueOnError)
	if err != nil {
		log.Error().Err(err).Msg("Execution failed")
		return 0
	}
	log.Error().Msg("No error logged")
	return 100
}

func mainShouldWork() int {
	initLogger()
	err := serve(pflag.ContinueOnError)
	if err != nil {
		log.Error().Err(err).Msg("Execution failed")
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
		Dir:           "tests/testscript",
		UpdateScripts: os.Getenv("UPDATE_SNAPSHOTS") == "1",
	})
}
