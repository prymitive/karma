package config

import (
	"bytes"
	"io"
	"os"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/prymitive/karma/internal/uri"
	"github.com/rs/zerolog"
	"github.com/spf13/pflag"

	"github.com/pmezard/go-difflib/difflib"

	yaml "gopkg.in/yaml.v3"
)

func resetEnv() {
	os.Clearenv()
}

func testReadConfig(t *testing.T) {
	expectedConfig := `authentication:
  header:
    name: ""
    value_re: ""
  basicAuth:
    users: []
authorization:
  groups: []
  acl:
    silences: ""
alertmanager:
  interval: 1s
  servers:
    - cluster: ""
      name: default
      uri: http://localhost
      external_uri: http://example.com
      proxy_url: ""
      timeout: 40s
      proxy: false
      readonly: false
      tls:
        ca: ""
        cert: ""
        key: ""
        insecureSkipVerify: false
      headers: {}
      cors:
        credentials: include
      healthcheck:
        visible: false
        filters: {}
alertAcknowledgement:
  enabled: false
  duration: 15m0s
  author: karma
  comment: ACK! This alert was acknowledged using karma on %NOW%
annotations:
  default:
    hidden: true
  hidden: []
  visible:
    - summary
  keep: []
  strip: []
  order: []
  actions: []
  enableInsecureHTML: false
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
  auto:
    ignore: []
    order: []
history:
  enabled: true
  workers: 30
  timeout: 20s
  rewrite: []
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
  timeout:
    read: 10s
    write: 20s
  tls:
    cert: ""
    key: ""
  port: 80
  prefix: /
log:
  config: false
  level: info
  format: text
  requests: false
  timestamp: false
receivers:
  keep: []
  strip: []
sentry:
  private: secret key
  public: public key
silences:
  comments:
    linkDetect:
      rules: []
silenceForm:
  strip:
    labels: []
ui:
  refresh: 30s
  hideFiltersWhenIdle: true
  colorTitlebar: false
  theme: auto
  animations: true
  minimalGroupWidth: 420
  alertsPerGroup: 5
  collapseGroups: collapsedOnMobile
  multiGridLabel: ""
  multiGridSortReverse: false
`

	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	err := enc.Encode(Config)
	if err != nil {
		t.Error(err)
	}
	configDump, _ := io.ReadAll(&buf)

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

func mockConfigRead() (string, error) {
	f := pflag.NewFlagSet(".", pflag.ExitOnError)
	SetupFlags(f)
	return Config.Read(f)
}

func TestReadConfig(t *testing.T) {
	resetEnv()
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
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
	_, _ = mockConfigRead()
	testReadConfig(t)
}

func TestReadSimpleConfig(t *testing.T) {
	resetEnv()
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("ALERTMANAGER_EXTERNAL_URI", "http://localhost:9090")
	os.Setenv("ALERTMANAGER_NAME", "single")
	os.Setenv("ALERTMANAGER_TIMEOUT", "15s")
	os.Setenv("ALERTMANAGER_PROXY", "true")
	os.Setenv("ALERTMANAGER_INTERVAL", "3m")
	_, _ = mockConfigRead()
	if len(Config.Alertmanager.Servers) != 1 {
		t.Errorf("Expected 1 Alertmanager server, got %d", len(Config.Alertmanager.Servers))
	} else {
		am := Config.Alertmanager.Servers[0]
		if am.URI != "http://localhost" {
			t.Errorf("Expect Alertmanager URI 'http://localhost' got '%s'", am.URI)
		}
		if am.ExternalURI != "http://localhost:9090" {
			t.Errorf("Expect Alertmanager external_uri 'http://localhost:9090' got '%s'", am.ExternalURI)
		}
		if am.Name != "single" {
			t.Errorf("Expect Alertmanager name 'single' got '%s'", am.Name)
		}
		if am.Timeout != time.Second*15 {
			t.Errorf("Expect Alertmanager timeout '%v' got '%v'", time.Second*15, am.Timeout)
		}
		if Config.Alertmanager.Interval != time.Minute*3 {
			t.Errorf("Expect Alertmanager timeout '%v' got '%v'", time.Minute*3, Config.Alertmanager.Interval)
		}
		if am.Proxy != true {
			t.Errorf("Expect Alertmanager proxy 'true' got '%v'", am.Proxy)
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
	_, _ = mockConfigRead()
	Config.LogValues()
}

func TestInvalidGridSortingOrder(t *testing.T) {
	resetEnv()
	os.Setenv("GRID_SORTING_ORDER", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid grid.sorting.order value didn't return any error")
	}
}

func TestInvalidUICollapseGroups(t *testing.T) {
	resetEnv()
	os.Setenv("UI_COLLAPSEGROUPS", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid ui.collapseGroups value didn't return any error")
	}
}

func TestInvalidUITheme(t *testing.T) {
	resetEnv()
	os.Setenv("UI_THEME", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid ui.theme value didn't return any error")
	}
}

func TestInvalidCORSCredentials(t *testing.T) {
	resetEnv()
	os.Setenv("ALERTMANAGER_CORS_CREDENTIALS", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid alertmanager.cors.credentials value didn't return any error")
	}
}

func TestDefaultConfig(t *testing.T) {
	resetEnv()
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	_, _ = mockConfigRead()

	expectedConfig := configSchema{}
	expectedConfig.Annotations.Hidden = []string{}
	expectedConfig.Annotations.Visible = []string{}
	expectedConfig.Annotations.Keep = []string{}
	expectedConfig.Annotations.Strip = []string{}
	expectedConfig.Annotations.Actions = []string{}
	expectedConfig.Annotations.Order = []string{}
	expectedConfig.Labels.Keep = []string{}
	expectedConfig.Labels.Strip = []string{}
	expectedConfig.Labels.Color.Static = []string{}
	expectedConfig.Labels.Color.Unique = []string{}
	expectedConfig.Grid.Auto.Ignore = []string{}
	expectedConfig.Grid.Auto.Order = []string{}
	expectedConfig.Receivers.Keep = []string{}
	expectedConfig.Receivers.Strip = []string{}
	expectedConfig.SilenceForm.Strip.Labels = []string{}

	if diff := cmp.Diff(expectedConfig.Annotations, Config.Annotations); diff != "" {
		t.Errorf("Wrong annotations config returned (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff(expectedConfig.Labels, Config.Labels); diff != "" {
		t.Errorf("Wrong labels config returned (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff(expectedConfig.Receivers, Config.Receivers); diff != "" {
		t.Errorf("Wrong receivers config returned (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff(expectedConfig.SilenceForm.Strip, Config.SilenceForm.Strip); diff != "" {
		t.Errorf("Wrong silence form config returned (-want +got):\n%s", diff)
	}
}

func TestValidateConfigMissingFile(t *testing.T) {
	err := validateConfigFile(("/foo/bar/xxx/yyy.yaml"))
	if err == nil {
		t.Errorf("validateConfigFile didn't return any error")
	}
}
