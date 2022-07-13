package main

import (
	"fmt"
	"os"
	"testing"

	"github.com/beme/abide"
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
	ecode := testscript.RunMain(m, map[string]func() int{
		"karma.bin-should-fail": mainShoulFail,
		"karma.bin-should-work": mainShouldWork,
	})
	err := abide.Cleanup()
	if err != nil {
		fmt.Printf("abide.Cleanup() error: %v\n", err)
		ecode = 1
	}
	os.Exit(ecode)
}

func TestScripts(t *testing.T) {
	testscript.Run(t, testscript.Params{
		Dir:           "tests/testscript",
		UpdateScripts: os.Getenv("UPDATE_SNAPSHOTS") == "1",
	})
}
