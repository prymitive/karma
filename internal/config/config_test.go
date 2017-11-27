package config

import (
	"os"
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/slices"

	log "github.com/sirupsen/logrus"
)

func testReadConfig(t *testing.T) {
	if Config.Alertmanager.Interval != time.Second {
		t.Errorf("Config.Alertmanager.Interval is invalid, expected 1s, got %v", Config.Alertmanager.Interval)
	}
	if Config.Debug != true {
		t.Errorf("Config.Debug is %v with env DEBUG=true set", Config.Debug)
	}
	if !slices.StringInSlice(Config.Colors.Labels.Static, "a") {
		t.Errorf("Config.Colors.Labels.Static is missing value 'a': %v", Config.Colors.Labels.Static)
	}
	if !slices.StringInSlice(Config.Colors.Labels.Static, "bb") {
		t.Errorf("Config.Colors.Labels.Static is missing value 'bb': %v", Config.Colors.Labels.Static)
	}
	if !slices.StringInSlice(Config.Colors.Labels.Static, "ccc") {
		t.Errorf("Config.Colors.Labels.Static is missing value 'ccc': %v", Config.Colors.Labels.Static)
	}
	if Config.Listen.Port != 8080 {
		t.Errorf("Config.Listen.Port is invalid, expected 8080, got %v", Config.Listen.Port)
	}
	if len(Config.Labels.Keep) != 0 {
		t.Errorf("Config.Labels.Keep is not empty, got %v", Config.Labels.Keep)
	}

}

func TestReadConfigLegacy(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_TTL", "1s")
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	os.Setenv("DEBUG", "true")
	os.Setenv("COLOR_LABELS_STATIC", "a bb ccc")
	Config.Read()
	testReadConfig(t)
}

func TestReadConfig(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_INTERVAL", "1s")
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	os.Setenv("DEBUG", "true")
	os.Setenv("COLORS_LABELS_STATIC", "a bb ccc")
	Config.Read()
	testReadConfig(t)
}

type urlSecretTest struct {
	raw       string
	sanitized string
}

var urlSecretTests = []urlSecretTest{
	urlSecretTest{
		raw:       "http://localhost",
		sanitized: "http://localhost",
	},
	urlSecretTest{
		raw:       "http://alertmanager.example.com/path",
		sanitized: "http://alertmanager.example.com/path",
	},
	urlSecretTest{
		raw:       "http://user@alertmanager.example.com/path",
		sanitized: "http://user@alertmanager.example.com/path",
	},
	urlSecretTest{
		raw:       "https://user:password@alertmanager.example.com/path",
		sanitized: "https://user:xxx@alertmanager.example.com/path",
	},
	urlSecretTest{
		raw:       "file://localhost",
		sanitized: "file://localhost",
	},
}

func TestUrlSecretTest(t *testing.T) {
	for _, testCase := range urlSecretTests {
		sanitized := hideURLPassword(testCase.raw)
		if sanitized != testCase.sanitized {
			t.Errorf("Invalid sanitized url, expected '%s', got '%s'", testCase.sanitized, sanitized)
		}
	}
}
