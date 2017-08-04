package config

import (
	"os"
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/slices"
)

type flagNameTest struct {
	env  string
	flag string
}

var flagNameTests = []flagNameTest{
	flagNameTest{env: "MyEnv", flag: "my.env"},
	flagNameTest{env: "MyENV", flag: "my.env"},
	flagNameTest{env: "MYEnv", flag: "myenv"},
}

func TestMakeFlagName(t *testing.T) {
	for _, testCase := range flagNameTests {
		generatedFlag := makeFlagName(testCase.env)
		if generatedFlag != testCase.flag {
			t.Errorf("Invalid flag name generated from env '%s', expected '%s', got '%s'", testCase.env, testCase.flag, generatedFlag)
		}
	}
}

func TestReadConfig(t *testing.T) {
	os.Setenv("ALERTMANAGER_TTL", "1s")
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	os.Setenv("DEBUG", "true")
	os.Setenv("COLOR_LABELS_STATIC", "a bb ccc")
	Config.Read()
	if Config.AlertmanagerTTL != time.Second {
		t.Errorf("Config.AlertmanagerTTL is invalid, expected 1s, got %v", Config.AlertmanagerTTL)
	}
	if Config.Debug != true {
		t.Errorf("Config.Debug is %v with env DEBUG=true set", Config.Debug)
	}
	if !slices.StringInSlice(Config.ColorLabelsStatic, "a") {
		t.Errorf("Config.ColorLabelsStatic is missing value 'a': %v", Config.ColorLabelsStatic)
	}
	if !slices.StringInSlice(Config.ColorLabelsStatic, "bb") {
		t.Errorf("Config.ColorLabelsStatic is missing value 'bb': %v", Config.ColorLabelsStatic)
	}
	if !slices.StringInSlice(Config.ColorLabelsStatic, "ccc") {
		t.Errorf("Config.ColorLabelsStatic is missing value 'ccc': %v", Config.ColorLabelsStatic)
	}
	if Config.Port != 8080 {
		t.Errorf("Config.Port is invalid, expected 8080, got %v", Config.Port)
	}

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
