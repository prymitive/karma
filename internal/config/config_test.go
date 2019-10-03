package config

import (
	"os"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/uri"

	"github.com/pmezard/go-difflib/difflib"

	log "github.com/sirupsen/logrus"
	yaml "gopkg.in/yaml.v2"
)

// unset all karma supported env variables before tests so we start with no
// config from previous test run
func resetEnv() {
	karmaEnvVariables := []string{
		"ALERTMANAGER_INTERVAL",
		"ALERTMANAGER_URI",
		"ALERTMANAGER_EXTERNAL_URI",
		"ALERTMANAGER_NAME",
		"ALERTMANAGET_TIMEOUT",
		"ANNOTATIONS_DEFAULT_HIDDEN",
		"ANNOTATIONS_HIDDEN",
		"ANNOTATIONS_VISIBLE",
		"CONFIG_FILE",
		"CUSTOM_CSS",
		"CUSTOM_JS",
		"DEBUG",
		"FILTERS_DEFAULT",
		"KARMA_NAME",
		"LABELS_COLOR_STATIC",
		"LABELS_COLOR_UNIQUE",
		"LABELS_KEEP",
		"LABELS_STRIP",
		"LISTEN_ADDRESS",
		"LISTEN_PORT",
		"LISTEN_PREFIX",
		"LOG_CONFIG",
		"LOG_LEVEL",
		"RECEIVERS_KEEP",
		"RECEIVERS_STRIP",
		"SENTRY_PRIVATE",
		"SENTRY_PUBLIC",

		"HOST",
		"PORT",
		"SENTRY_DSN",
	}
	for _, env := range karmaEnvVariables {
		os.Unsetenv(env)
	}
}

func testReadConfig(t *testing.T) {
	expectedConfig := `alertmanager:
  interval: 1s
  servers:
  - name: default
    uri: http://localhost
    external_uri: http://example.com
    timeout: 40s
    proxy: false
    tls:
      ca: ""
      cert: ""
      key: ""
      insecureSkipVerify: false
    headers: {}
annotations:
  default:
    hidden: true
  hidden: []
  visible:
  - summary
  keep: []
  strip: []
custom:
  css: /custom.css
  js: /custom.js
debug: true
filters:
  default:
  - '@state=active'
  - foo=bar
grid:
  sorting:
    order: startsAt
    reverse: true
    label: alertname
    customValues:
      labels: {}
karma:
  name: another karma
labels:
  keep:
  - foo
  - bar
  strip:
  - abc
  - def
  color:
    custom: {}
    static:
    - a
    - bb
    - ccc
    unique:
    - f
    - gg
listen:
  address: 0.0.0.0
  port: 80
  prefix: /
log:
  config: true
  level: info
  format: text
jira: []
receivers:
  keep: []
  strip: []
sentry:
  private: secret key
  public: public key
silenceForm:
  author:
    populate_from_header:
      header: ""
      value_re: ""
  strip:
    labels: []
`

	configDump, err := yaml.Marshal(Config)
	if err != nil {
		t.Error(err)
	}

	if string(configDump) != expectedConfig {
		diff := difflib.UnifiedDiff{
			A:        difflib.SplitLines(expectedConfig),
			B:        difflib.SplitLines(string(configDump)),
			FromFile: "Expected",
			ToFile:   "Current",
			Context:  3,
		}
		text, err := difflib.GetUnifiedDiffString(diff)
		if err != nil {
			t.Error(err)
		}
		t.Errorf("Config mismatch:\n%s", text)
	}
}

func TestReadConfig(t *testing.T) {
	resetEnv()
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_INTERVAL", "1s")
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("ALERTMANAGER_EXTERNAL_URI", "http://example.com")
	os.Setenv("ANNOTATIONS_DEFAULT_HIDDEN", "true")
	os.Setenv("ANNOTATIONS_VISIBLE", "summary")
	os.Setenv("CUSTOM_CSS", "/custom.css")
	os.Setenv("CUSTOM_JS", "/custom.js")
	os.Setenv("DEBUG", "true")
	os.Setenv("FILTERS_DEFAULT", "@state=active foo=bar")
	os.Setenv("KARMA_NAME", "another karma")
	os.Setenv("LABELS_COLOR_STATIC", "a bb ccc")
	os.Setenv("LABELS_COLOR_UNIQUE", "f gg")
	os.Setenv("LABELS_KEEP", "foo bar")
	os.Setenv("LABELS_STRIP", "abc def")
	os.Setenv("LISTEN_ADDRESS", "0.0.0.0")
	os.Setenv("LISTEN_PORT", "80")
	os.Setenv("SENTRY_PRIVATE", "secret key")
	os.Setenv("SENTRY_PUBLIC", "public key")
	Config.Read()
	testReadConfig(t)
}

func TestReadSimpleConfig(t *testing.T) {
	resetEnv()
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("ALERTMANAGER_NAME", "single")
	os.Setenv("ALERTMANAGER_TIMEOUT", "15s")
	os.Setenv("ALERTMANAGER_PROXY", "true")
	os.Setenv("ALERTMANAGER_INTERVAL", "3m")
	Config.Read()
	if len(Config.Alertmanager.Servers) != 1 {
		t.Errorf("Expected 1 Alertmanager server, got %d", len(Config.Alertmanager.Servers))
	} else {
		am := Config.Alertmanager.Servers[0]
		if am.Name != "single" {
			t.Errorf("Expect Alertmanager name 'single' got '%s'", am.Name)
		}
		if am.Timeout != time.Second*15 {
			t.Errorf("Expect Alertmanager timeout '%v' got '%v'", time.Second*15, am.Timeout)
		}
		if Config.Alertmanager.Interval != time.Minute*3 {
			t.Errorf("Expect Alertmanager timeout '%v' got '%v'", time.Minute*3, Config.Alertmanager.Interval)
		}
	}
}

type urlSecretTest struct {
	raw       string
	sanitized string
}

var urlSecretTests = []urlSecretTest{
	{
		raw:       "http://localhost",
		sanitized: "http://localhost",
	},
	{
		raw:       "http://alertmanager.example.com/path",
		sanitized: "http://alertmanager.example.com/path",
	},
	{
		raw:       "http://user@alertmanager.example.com/path",
		sanitized: "http://user@alertmanager.example.com/path",
	},
	{
		raw:       "https://user:password@alertmanager.example.com/path",
		sanitized: "https://user:xxx@alertmanager.example.com/path",
	},
	{
		raw:       "file://localhost",
		sanitized: "file://localhost",
	},
}

func TestUrlSecretTest(t *testing.T) {
	for _, testCase := range urlSecretTests {
		sanitized := uri.SanitizeURI(testCase.raw)
		if sanitized != testCase.sanitized {
			t.Errorf("Invalid sanitized url, expected '%s', got '%s'", testCase.sanitized, sanitized)
		}
	}
}

// FIXME check logged values
func TestLogValues(t *testing.T) {
	Config.Read()
	Config.LogValues()
}

func TestInvalidSilenceFormRegex(t *testing.T) {
	resetEnv()
	os.Setenv("SILENCEFORM_AUTHOR_POPULATE_FROM_HEADER_VALUE_RE", ".****")

	log.SetLevel(log.PanicLevel)
	defer func() { log.StandardLogger().ExitFunc = nil }()
	var wasFatal bool
	log.StandardLogger().ExitFunc = func(int) { wasFatal = true }

	Config.Read()

	if !wasFatal {
		t.Error("Invalid silence form regex didn't cause log.Fatal()")
	}
}
