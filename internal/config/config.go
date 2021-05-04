package config

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/regex"
	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/uri"

	"github.com/knadh/koanf"
	yamlParser "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/confmap"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/providers/posflag"
	"github.com/mitchellh/mapstructure"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"

	yaml "gopkg.in/yaml.v3"
)

var (
	// Config will hold final configuration read from the file and flags
	Config *configSchema
)

func init() {
	Config = &configSchema{}
}

// SetupFlags is used to attach configuration flags to the main flag set
func SetupFlags(f *pflag.FlagSet) {
	f.Duration("alertmanager.interval", time.Minute,
		"Interval for fetching data from Alertmanager servers")
	f.String("alertmanager.name", "default",
		"Name for the Alertmanager server (only used with simplified config)")
	f.String("alertmanager.uri", "",
		"Alertmanager server URI (only used with simplified config)")
	f.String("alertmanager.external_uri", "",
		"Alertmanager server URI used for web UI links (only used with simplified config)")
	f.Duration("alertmanager.timeout", time.Second*40,
		"Timeout for requests sent to the Alertmanager server (only used with simplified config)")
	f.Bool("alertmanager.proxy", false,
		"Proxy all client requests to Alertmanager via karma (only used with simplified config)")
	f.Bool("alertmanager.readonly", false,
		"Enable read-only mode that disable silence management (only used with simplified config)")
	f.String("alertmanager.cors.credentials", "include", "CORS credentials policy for browser fetch requests")

	f.String("karma.name", "karma", "Name for the karma instance")

	f.Bool("alertAcknowledgement.enabled", false, "Enable alert acknowledging")
	f.Duration("alertAcknowledgement.duration", time.Minute*15, "Initial silence duration when acknowledging alerts with short lived silences")
	f.String("alertAcknowledgement.author", "karma", "Default silence author when acknowledging alerts with short lived silences")
	f.String("alertAcknowledgement.comment", "ACK! This alert was acknowledged using karma on %NOW%", "Comment used when acknowledging alerts with short lived silences")

	f.String("authorization.acl.silences", "", "Path to silence ACL config file")

	f.Bool(
		"annotations.default.hidden", false,
		"Hide all annotations by default unless explicitly listed in the 'visible' list")
	f.StringSlice("annotations.hidden", []string{},
		"List of annotations that are hidden by default")
	f.StringSlice("annotations.visible", []string{},
		"List of annotations that are visible by default")
	f.StringSlice("annotations.keep", []string{},
		"List of annotations to keep, all other annotations will be stripped")
	f.StringSlice("annotations.strip", []string{}, "List of annotations to ignore")
	f.StringSlice("annotations.actions", []string{}, "List of annotations that will be moved to the alert menu")
	f.StringSlice("annotations.order", []string{}, "Preferred order of annotation names")
	f.Bool("annotations.enableInsecureHTML", false, "Enable HTML strings in annotations to be parsed as HTML, enable at your own risk")

	f.String("config.file", "", "Full path to the configuration file, 'karma.yaml' will be used if found in the current working directory")

	f.String("custom.css", "", "Path to a file with custom CSS to load")
	f.String("custom.js", "", "Path to a file with custom JavaScript to load")

	f.Bool("debug", false, "Enable debug mode")

	f.StringSlice("filters.default", []string{}, "List of default filters")

	f.StringSlice("labels.color.static", []string{},
		"List of label names that should have the same (but distinct) color")
	f.StringSlice("labels.color.unique", []string{},
		"List of label names that should have unique color")
	f.StringSlice("labels.keep", []string{},
		"List of labels to keep, all other labels will be stripped")
	f.StringSlice("labels.strip", []string{}, "List of labels to ignore")

	f.String("grid.sorting.order", "startsAt", "Default sort order for alert grid")
	f.Bool("grid.sorting.reverse", true, "Reverse sort order")
	f.String("grid.sorting.label", "alertname", "Label name to use when sorting alert grid by label")
	f.StringSlice("grid.auto.ignore", []string{}, "List of label names not allowed for automatic multi-grid")
	f.StringSlice("grid.auto.order", []string{}, "Order of preference for selecting label names for automatic multi-grid")

	f.Bool("history.enabled", true, "Enable alert history queries")
	f.Duration("history.timeout", time.Second*20, "Timeout for history queries against source Prometheus servers")
	f.Int("history.workers", 30, "Number of history query workers to run")

	f.Bool("log.config", false, "Log used configuration to log on startup")
	f.String("log.level", "info",
		"Log level, one of: debug, info, warning, error, fatal and panic")
	f.String("log.format", "text",
		"Log format, one of: text, json")
	f.Bool("log.requests", false, "Enable request logging")
	f.Bool("log.timestamp", false, "Add timestamps to all log messages")

	f.StringSlice("receivers.keep", []string{},
		"List of receivers to keep, all alerts with different receivers will be ignored")
	f.StringSlice("receivers.strip", []string{},
		"List of receivers to not display alerts for")

	f.StringSlice("silenceform.strip.labels", []string{}, "List of labels to ignore when auto-filling silence form from alerts")

	f.String("listen.address", "", "IP/Hostname to listen on")
	f.Int("listen.port", 8080, "HTTP port to listen on")
	f.String("listen.prefix", "/", "URL prefix")
	f.String("listen.tls.cert", "", "TLS certificate path (enables HTTPS)")
	f.String("listen.tls.key", "", "TLS key path (enables HTTPS)")
	f.Duration("listen.timeout.read", time.Second*10, "HTTP request read timeout")
	f.Duration("listen.timeout.write", time.Second*20, "HTTP response write timeout")

	f.String("sentry.public", "", "Sentry DSN for Go exceptions")
	f.String("sentry.private", "", "Sentry DSN for JavaScript exceptions")

	f.Duration("ui.refresh", time.Second*30, "UI refresh interval")
	f.Bool("ui.hideFiltersWhenIdle", true, "Hide the filters bar when idle")
	f.Bool("ui.colorTitlebar", false, "Color alert group titlebar based on alert state")
	f.String("ui.theme", "auto", "Default theme, 'light', 'dark' or 'auto' (follow browser preference)")
	f.Bool("ui.animations", true, "Enable UI animations")
	f.Int("ui.minimalGroupWidth", 420, "Minimal width for each alert group on the grid")
	f.Int("ui.alertsPerGroup", 5, "Default number of alerts to show for each alert group")
	f.String("ui.collapseGroups", "collapsedOnMobile", "Default state for alert groups")
}

func validateConfigFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}

	cfg := configSchema{}
	d := yaml.NewDecoder(f)
	d.KnownFields(true)
	err = d.Decode(&cfg)
	if err != nil {
		return err
	}

	return nil
}

func readConfigFile(k *koanf.Koanf, flags *pflag.FlagSet) (string, error) {
	var configFile string

	// 1. Load file from flags is set
	configFile, _ = flags.GetString("config.file")
	// 2. Fallback to CONFIG_FILE env if there's no flag value
	if configFile == "" {
		if v, found := os.LookupEnv("CONFIG_FILE"); found {
			configFile = v
		}
	}
	// 3 see if there's karma.yaml in current working directory
	if configFile == "" {
		if _, err := os.Stat("karma.yaml"); !os.IsNotExist(err) {
			configFile = "karma.yaml"
		}
	}
	if configFile != "" {
		if err := k.Load(file.Provider(configFile), yamlParser.Parser()); err != nil {
			return "", fmt.Errorf("failed to load configuration file %q: %v", configFile, err)
		}
		return configFile, nil
	}
	return configFile, nil
}

func readEnvVariables(k *koanf.Koanf) {
	customEnvs := map[string]string{
		"HOST":       "listen.address",
		"PORT":       "listen.port",
		"SENTRY_DSN": "sentry.private",
	}
	for env, key := range customEnvs {
		if _, found := os.LookupEnv(env); found {
			_ = k.Load(confmap.Provider(map[string]interface{}{
				key: os.Getenv(env),
			}, "."), nil)
		}
	}

	_ = k.Load(env.Provider("", ".", func(s string) string {
		switch s {
		case "ALERTMANAGER_EXTERNAL_URI":
			return "alertmanager.external_uri"
		case "ALERTACKNOWLEDGEMENT_ENABLED":
			return "alertAcknowledgement.enabled"
		case "ALERTACKNOWLEDGEMENT_DURATION":
			return "alertAcknowledgement.duration"
		case "ALERTACKNOWLEDGEMENT_AUTHOR":
			return "alertAcknowledgement.author"
		case "ALERTACKNOWLEDGEMENT_COMMENT":
			return "alertAcknowledgement.comment"
		case "ANNOTATIONS_ENABLEINSECUREHTML":
			return "annotations.enableInsecureHTML"
		case "AUTHENTICATION_HEADER_VALUE_RE":
			return "authentication.header.value_re"
		case "SILENCEFORM_STRIP_LABELS":
			return "silenceForm.strip.labels"
		case "UI_HIDEFILTERSWHENIDLE":
			return "ui.hideFiltersWhenIdle"
		case "UI_COLORTITLEBAR":
			return "ui.colorTitlebar"
		case "UI_MINIMALGROUPWIDTH":
			return "ui.minimalGroupWidth"
		case "UI_ALERTSPERGROUP":
			return "ui.alertsPerGroup"
		case "UI_COLLAPSEGROUPS":
			return "ui.collapseGroups"
		default:
			return strings.Replace(strings.ToLower(s), "_", ".", -1)
		}
	}), nil)
}

func readFlags(k *koanf.Koanf, flags *pflag.FlagSet) {
	_ = k.Load(posflag.Provider(flags, ".", k), nil)
}

// ReadConfig will read all sources of configuration, merge all keys and
// populate global Config variable, it should be only called on startup
// Order in which we read configuration:
// 1. CLI flags
// 2. Config file
// 3. Environment variables
func (config *configSchema) Read(flags *pflag.FlagSet) (string, error) {
	k := koanf.New(".")
	var configFileUsed string

	// 3. read all environment variables
	readEnvVariables(k)
	// 2. read config file
	cf, err := readConfigFile(k, flags)
	if err != nil {
		return "", err
	}
	if cf != "" {
		configFileUsed = cf
	}
	// 1. read flags
	readFlags(k, flags)

	dConf := mapstructure.DecoderConfig{
		Result:           &config,
		WeaklyTypedInput: true,
		DecodeHook: mapstructure.ComposeDecodeHookFunc(
			mapstructure.StringToSliceHookFunc(" "),
			mapstructure.StringToTimeDurationHookFunc(),
		),
		ZeroFields: true,
	}
	kConf := koanf.UnmarshalConf{
		Tag:           "koanf",
		FlatPaths:     false,
		DecoderConfig: &dConf,
	}
	err = k.UnmarshalWithConf("", &config, kConf)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal configuration: %v", err)
	}

	if configFileUsed != "" {
		if err := validateConfigFile(configFileUsed); err != nil {
			return "", fmt.Errorf("failed to parse configuration file %q: %v", configFileUsed, err)
		}
	}

	if config.Authentication.Header.Name != "" && len(config.Authentication.BasicAuth.Users) > 0 {
		return "", fmt.Errorf("both authentication.basicAuth.users and authentication.header.name is set, only one can be enabled")
	}

	if config.Authentication.Header.ValueRegex != "" {
		_, err = regex.CompileAnchored(config.Authentication.Header.ValueRegex)
		if err != nil {
			return "", fmt.Errorf("invalid regex for authentication.header.value_re: %s", err.Error())
		}
		if config.Authentication.Header.Name == "" {
			return "", fmt.Errorf("authentication.header.name is required when authentication.header.value_re is set")
		}
	} else if config.Authentication.Header.Name != "" {
		return "", fmt.Errorf("authentication.header.value_re is required when authentication.header.name is set")
	}

	for _, u := range config.Authentication.BasicAuth.Users {
		if u.Username == "" || u.Password == "" {
			return "", fmt.Errorf("authentication.basicAuth.users require both username and password to be set")
		}
	}

	if config.Authentication.Header.Name != "" || len(config.Authentication.BasicAuth.Users) > 0 {
		config.Authentication.Enabled = true
	}

	if !slices.StringInSlice([]string{"omit", "include", "same-origin"}, config.Alertmanager.CORS.Credentials) {
		return "", fmt.Errorf("invalid alertmanager.cors.credentials value '%s', allowed options: omit, inclue, same-origin", config.Alertmanager.CORS.Credentials)
	}

	for i, s := range config.Alertmanager.Servers {
		if s.Name == "" {
			config.Alertmanager.Servers[i].Name = "default"
		}
		if s.Timeout.Seconds() == 0 {
			config.Alertmanager.Servers[i].Timeout = config.Alertmanager.Timeout
		}
		if s.CORS.Credentials == "" {
			config.Alertmanager.Servers[i].CORS.Credentials = config.Alertmanager.CORS.Credentials
		}
		if !slices.StringInSlice([]string{"omit", "include", "same-origin"}, config.Alertmanager.Servers[i].CORS.Credentials) {
			return "", fmt.Errorf("invalid cors.credentials value '%s' for alertmanager '%s', allowed options: omit, inclue, same-origin", config.Alertmanager.Servers[i].CORS.Credentials, s.Name)
		}
	}

	for _, authGroup := range config.Authorization.Groups {
		if authGroup.Name == "" {
			return "", fmt.Errorf("'name' is required for every authorization group")
		}
		if len(authGroup.Members) == 0 {
			return "", fmt.Errorf("'members' is required for every authorization group")
		}
	}

	for labelName, customColors := range config.Labels.Color.Custom {
		for i, customColor := range customColors {
			if customColor.Value == "" && customColor.ValueRegex == "" {
				return "", fmt.Errorf("custom label color for '%s' is missing 'value' or 'value_re'", labelName)
			}
			if customColor.ValueRegex != "" {
				config.Labels.Color.Custom[labelName][i].CompiledRegex, err = regex.CompileAnchored(customColor.ValueRegex)
				if err != nil {
					return "", fmt.Errorf("failed to parse custom color regex rule '%s' for '%s' label: %s", customColor.ValueRegex, labelName, err)
				}
			}
		}
	}

	if !slices.StringInSlice([]string{"disabled", "startsAt", "label"}, config.Grid.Sorting.Order) {
		return "", fmt.Errorf("invalid grid.sorting.order value '%s', allowed options: disabled, startsAt, label", config.Grid.Sorting.Order)
	}

	if !slices.StringInSlice([]string{"expanded", "collapsed", "collapsedOnMobile"}, config.UI.CollapseGroups) {
		return "", fmt.Errorf("invalid ui.collapseGroups value '%s', allowed options: expanded, collapsed, collapsedOnMobile", config.UI.CollapseGroups)
	}

	if !slices.StringInSlice([]string{"light", "dark", "auto"}, config.UI.Theme) {
		return "", fmt.Errorf("invalid ui.theme value '%s', allowed options: light, dark, auto", config.UI.Theme)
	}

	if config.Listen.Prefix != "" && !strings.HasPrefix(config.Listen.Prefix, "/") {
		return "", fmt.Errorf("listen.prefix must start with '/', got %q", config.Listen.Prefix)
	}

	if config.Listen.TLS.Cert != "" && config.Listen.TLS.Key == "" {
		return "", fmt.Errorf("listen.tls.key must be set when listen.tls.cert is set")
	}

	if config.Listen.TLS.Key != "" && config.Listen.TLS.Cert == "" {
		return "", fmt.Errorf("listen.tls.cert must be set when listen.tls.key is set")
	}

	for i := 0; i < len(config.History.Rewrite); i++ {
		config.History.Rewrite[i].SourceRegex, err = regex.CompileAnchored(config.History.Rewrite[i].Source)
		if err != nil {
			return "", fmt.Errorf("history.rewrite source regex %q is invalid: %v", config.History.Rewrite[i].Source, err)
		}
	}

	// accept single Alertmanager server from flag/env if nothing is set yet
	if len(config.Alertmanager.Servers) == 0 && config.Alertmanager.URI != "" {
		config.Alertmanager.Servers = []AlertmanagerConfig{
			{
				Name:        config.Alertmanager.Name,
				URI:         config.Alertmanager.URI,
				ExternalURI: config.Alertmanager.ExternalURI,
				Timeout:     config.Alertmanager.Timeout,
				Proxy:       config.Alertmanager.Proxy,
				ReadOnly:    config.Alertmanager.ReadOnly,
				Headers:     make(map[string]string),
				CORS:        config.Alertmanager.CORS,
			},
		}
	}

	Config = config

	return configFileUsed, nil
}

// LogValues will dump runtime config to logs
func (config *configSchema) LogValues() {
	// make a copy of our config so we can edit it
	cfg := configSchema(*config)

	auth := []AuthenticationUser{}
	for _, u := range cfg.Authentication.BasicAuth.Users {
		uu := AuthenticationUser{
			Username: u.Username,
			Password: "***",
		}
		auth = append(auth, uu)
	}
	cfg.Authentication.BasicAuth.Users = auth

	// replace passwords in Alertmanager URIs with 'xxx'
	servers := []AlertmanagerConfig{}
	for _, s := range cfg.Alertmanager.Servers {
		h := map[string]string{}
		for key := range s.Headers {
			h[key] = "***"
		}
		server := AlertmanagerConfig{
			Cluster:     s.Cluster,
			Name:        s.Name,
			URI:         uri.SanitizeURI(s.URI),
			ExternalURI: uri.SanitizeURI(s.ExternalURI),
			ProxyURL:    s.ProxyURL,
			Timeout:     s.Timeout,
			TLS:         s.TLS,
			Proxy:       s.Proxy,
			ReadOnly:    s.ReadOnly,
			Headers:     h,
			CORS:        s.CORS,
			Healthcheck: s.Healthcheck,
		}
		servers = append(servers, server)
	}
	cfg.Alertmanager.Servers = servers

	// replace secret in Sentry DNS with 'xxx'
	if config.Sentry.Private != "" {
		config.Sentry.Private = uri.SanitizeURI(config.Sentry.Private)
	}

	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	_ = enc.Encode(cfg)

	log.Info().Msg("Parsed configuration:")
	scanner := bufio.NewScanner(&buf)
	for scanner.Scan() {
		log.Info().Msg(scanner.Text())
	}
}
