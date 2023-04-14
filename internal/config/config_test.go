package config

import (
	"bytes"
	"io"
	"regexp"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/rs/zerolog"
	"github.com/spf13/pflag"

	"github.com/prymitive/karma/internal/uri"

	"github.com/pmezard/go-difflib/difflib"

	yaml "gopkg.in/yaml.v3"
)

func testReadConfig(t *testing.T) {
	expectedConfig := `authentication:
  header:
    name: ""
    value_re: ""
    group_name: ""
    group_value_re: ""
    group_value_separator: ' '
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
  groupLimit: 40
history:
  enabled: true
  workers: 30
  timeout: 20s
  rewrite: []
karma:
  name: another karma
labels:
  order: []
  keep:
    - foo
    - bar
  keep_re:
    - fo+
    - ba.
  strip:
    - abc
    - def
  strip_re:
    - g.*
  valueOnly: []
  valueOnly_re:
    - fo+
    - .ar
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
  cors:
    allowedOrigins: []
log:
  level: info
  format: text
  config: false
  requests: false
  timestamp: false
receivers:
  keep: []
  strip: []
silences:
  expired: 10m0s
  comments:
    linkDetect:
      rules: []
silenceForm:
  strip:
    labels: []
  defaultAlertmanagers: []
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
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	t.Setenv("ALERTMANAGER_INTERVAL", "1s")
	t.Setenv("ALERTMANAGER_URI", "http://localhost")
	t.Setenv("ALERTMANAGER_EXTERNAL_URI", "http://example.com")
	t.Setenv("ANNOTATIONS_DEFAULT_HIDDEN", "true")
	t.Setenv("ANNOTATIONS_VISIBLE", "summary")
	t.Setenv("CUSTOM_CSS", "/custom.css")
	t.Setenv("CUSTOM_JS", "/custom.js")
	t.Setenv("DEBUG", "true")
	t.Setenv("FILTERS_DEFAULT", "@state=active foo=bar")
	t.Setenv("KARMA_NAME", "another karma")
	t.Setenv("LABELS_COLOR_STATIC", "a bb ccc")
	t.Setenv("LABELS_COLOR_UNIQUE", "f gg")
	t.Setenv("LABELS_KEEP", "foo bar")
	t.Setenv("LABELS_KEEP_RE", "fo+ ba.")
	t.Setenv("LABELS_STRIP", "abc def")
	t.Setenv("LABELS_STRIP_RE", "g.*")
	t.Setenv("LABELS_VALUEONLY_RE", "fo+ .ar")
	t.Setenv("LISTEN_ADDRESS", "0.0.0.0")
	t.Setenv("LISTEN_PORT", "80")
	_, _ = mockConfigRead()
	testReadConfig(t)
}

func TestReadSimpleConfig(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	t.Setenv("ALERTMANAGER_URI", "http://localhost")
	t.Setenv("ALERTMANAGER_EXTERNAL_URI", "http://localhost:9090")
	t.Setenv("ALERTMANAGER_NAME", "single")
	t.Setenv("ALERTMANAGER_TIMEOUT", "15s")
	t.Setenv("ALERTMANAGER_PROXY", "true")
	t.Setenv("ALERTMANAGER_INTERVAL", "3m")
	t.Setenv("ALERTMANAGER_TLS_CA", "/my-ca.cer")
	t.Setenv("ALERTMANAGER_TLS_CERT", "/my-cert.cer")
	t.Setenv("ALERTMANAGER_TLS_KEY", "/my-cert.key")
	t.Setenv("ALERTMANAGER_TLS_INSECURE_SKIP_VERIFY", "true")
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
		if am.TLS.CA != "/my-ca.cer" {
			t.Errorf("Expected Alertmanager TLS CA '/my-ca.cer' got '%s'", am.TLS.CA)
		}
		if am.TLS.Cert != "/my-cert.cer" {
			t.Errorf("Expected Alertmanager TLS Cert '/my-cert.cer' got '%s'", am.TLS.Cert)
		}
		if am.TLS.Key != "/my-cert.key" {
			t.Errorf("Expected Alertmanager TLS Key '/my-cert.key' got '%s'", am.TLS.Key)
		}
		if am.TLS.InsecureSkipVerify != true {
			t.Errorf("Expected Alertmanager TLS insecureSkipVerify 'true' got '%v'", am.TLS.InsecureSkipVerify)
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
func TestLogValues(_ *testing.T) {
	_, _ = mockConfigRead()
	Config.LogValues()
}

func TestInvalidGridSortingOrder(t *testing.T) {
	t.Setenv("GRID_SORTING_ORDER", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid grid.sorting.order value didn't return any error")
	}
}

func TestInvalidUICollapseGroups(t *testing.T) {
	t.Setenv("UI_COLLAPSEGROUPS", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid ui.collapseGroups value didn't return any error")
	}
}

func TestInvalidUITheme(t *testing.T) {
	t.Setenv("UI_THEME", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid ui.theme value didn't return any error")
	}
}

func TestInvalidCORSCredentials(t *testing.T) {
	t.Setenv("ALERTMANAGER_CORS_CREDENTIALS", "foo")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid alertmanager.cors.credentials value didn't return any error")
	}
}

func TestInvalidKeepRegex(t *testing.T) {
	t.Setenv("LABELS_KEEP_RE", "fo**")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid labels.keep_re regex didn't return any error")
	}
}

func TestInvalidStripRegex(t *testing.T) {
	t.Setenv("LABELS_STRIP_RE", "fo**")

	_, err := mockConfigRead()
	if err == nil {
		t.Error("Invalid labels.strip_re regex didn't return any error")
	}
}

func TestDefaultConfig(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	_, _ = mockConfigRead()

	expectedConfig := configSchema{}
	expectedConfig.Annotations.Hidden = []string{}
	expectedConfig.Annotations.Visible = []string{}
	expectedConfig.Annotations.Keep = []string{}
	expectedConfig.Annotations.Strip = []string{}
	expectedConfig.Annotations.Actions = []string{}
	expectedConfig.Annotations.Order = []string{}
	expectedConfig.Labels.Order = []string{}
	expectedConfig.Labels.Keep = []string{}
	expectedConfig.Labels.KeepRegex = []string{}
	expectedConfig.Labels.CompiledKeepRegex = []*regexp.Regexp{}
	expectedConfig.Labels.Strip = []string{}
	expectedConfig.Labels.StripRegex = []string{}
	expectedConfig.Labels.CompiledStripRegex = []*regexp.Regexp{}
	expectedConfig.Labels.Color.Static = []string{}
	expectedConfig.Labels.Color.Unique = []string{}
	expectedConfig.Labels.ValueOnly = []string{}
	expectedConfig.Labels.ValueOnlyRegex = []string{}
	expectedConfig.Labels.CompiledValueOnlyRegex = []*regexp.Regexp{}
	expectedConfig.Grid.Auto.Ignore = []string{}
	expectedConfig.Grid.Auto.Order = []string{}
	expectedConfig.Receivers.Keep = []string{}
	expectedConfig.Receivers.Strip = []string{}
	expectedConfig.SilenceForm.Strip.Labels = []string{}
	expectedConfig.SilenceForm.DefaultAlertmanagers = []string{}

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
	if diff := cmp.Diff(expectedConfig.SilenceForm.DefaultAlertmanagers, Config.SilenceForm.DefaultAlertmanagers); diff != "" {
		t.Errorf("Wrong defaultAlertmanagers form config returned (-want +got):\n%s", diff)
	}
}

func TestValidateConfigMissingFile(t *testing.T) {
	err := validateConfigFile(("/foo/bar/xxx/yyy.yaml"))
	if err == nil {
		t.Errorf("validateConfigFile didn't return any error")
	}
}
