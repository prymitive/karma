package config

import (
	"bufio"
	"bytes"
	"io/ioutil"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/uri"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"

	log "github.com/sirupsen/logrus"
	yaml "gopkg.in/yaml.v2"
)

var (
	// Config will hold final configuration read from the file and flags
	Config configSchema
)

func init() {
	pflag.Duration("alertmanager.interval", time.Minute,
		"Interval for fetching data from Alertmanager servers")
	pflag.String("alertmanager.name", "default",
		"Name for the Alertmanager server (only used with simplified config)")
	pflag.String("alertmanager.uri", "",
		"Alertmanager server URI (only used with simplified config)")
	pflag.String("alertmanager.external_uri", "",
		"Alertmanager server URI used for web UI links (only used with simplified config)")
	pflag.Duration("alertmanager.timeout", time.Second*40,
		"Timeout for requests sent to the Alertmanager server (only used with simplified config)")
	pflag.Bool("alertmanager.proxy", false,
		"Proxy all client requests to Alertmanager via karma (only used with simplified config)")

	pflag.String("karma.name", "karma",
		"Name for the karma instance name")

	pflag.Bool(
		"annotations.default.hidden", false,
		"Hide all annotations by default unless explicitly listed in the 'visible' list")
	pflag.StringSlice("annotations.hidden", []string{},
		"List of annotations that are hidden by default")
	pflag.StringSlice("annotations.visible", []string{},
		"List of annotations that are visible by default")
	pflag.StringSlice("annotations.keep", []string{},
		"List of annotations to keep, all other annotations will be stripped")
	pflag.StringSlice("annotations.strip", []string{}, "List of annotations to ignore")

	pflag.String("config.file", "", "Full path to the configuration file")

	pflag.String("custom.css", "", "Path to a file with custom CSS to load")
	pflag.String("custom.js", "", "Path to a file with custom JavaScript to load")

	pflag.Bool("debug", false, "Enable debug mode")

	pflag.StringSlice("filters.default", []string{}, "List of default filters")

	pflag.StringSlice("labels.color.static", []string{},
		"List of label names that should have the same (but distinct) color")
	pflag.StringSlice("labels.color.unique", []string{},
		"List of label names that should have unique color")
	pflag.StringSlice("labels.keep", []string{},
		"List of labels to keep, all other labels will be stripped")
	pflag.StringSlice("labels.strip", []string{}, "List of labels to ignore")

	pflag.String("grid.sorting.order", "startsAt", "Default sort order for alert grid")
	pflag.Bool("grid.sorting.reverse", true, "Reverse sort order")
	pflag.String("grid.sorting.label", "alertname", "Label name to use when sorting alert grid by label")

	pflag.Bool("log.config", true, "Log used configuration to log on startup")
	pflag.String("log.level", "info",
		"Log level, one of: debug, info, warning, error, fatal and panic")
	pflag.String("log.format", "text",
		"Log format, one of: text, json")

	pflag.StringSlice("receivers.keep", []string{},
		"List of receivers to keep, all alerts with different receivers will be ignored")
	pflag.StringSlice("receivers.strip", []string{},
		"List of receivers to not display alerts for")

	pflag.StringSlice("silenceform.strip.labels", []string{}, "List of labels to ignore when auto-filling silence form from alerts")
	pflag.String("silenceform.author.populate_from_header.header", "", "Header to read the default silence author from")
	pflag.String("silenceform.author.populate_from_header.value_re", "", "Header value regex to read the default silence author")

	pflag.String("listen.address", "", "IP/Hostname to listen on")
	pflag.Int("listen.port", 8080, "HTTP port to listen on")
	pflag.String("listen.prefix", "/", "URL prefix")

	pflag.String("sentry.public", "", "Sentry DSN for Go exceptions")
	pflag.String("sentry.private", "", "Sentry DSN for JavaScript exceptions")
}

// ReadConfig will read all sources of configuration, merge all keys and
// populate global Config variable, it should be only called on startup
func (config *configSchema) Read() {
	v := viper.New()

	err := v.BindPFlags(pflag.CommandLine)
	if err != nil {
		log.Errorf("Failed to bind flag set to the configuration: %s", err)
	}

	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// special envs
	// HOST and PORT is used by gin
	err = v.BindEnv("listen.address", "HOST")
	if err != nil {
		log.Errorf("Failed to bind listen.address config key to the HOST env variable: %s", err)
	}

	err = v.BindEnv("listen.port", "PORT")
	if err != nil {
		log.Errorf("Failed to bind listen.port config key to the PORT env variable: %s", err)
	}

	// raven-go expects this
	err = v.BindEnv("sentry.private", "SENTRY_DSN")
	if err != nil {
		log.Errorf("Failed to bind sentry.private config key to the SENTRY_DSN env variable: %s", err)
	}

	v.SetConfigType("yaml")
	configFile := v.GetString("config.file")
	// if config file is not set then try loading karma.yaml from current directory
	if configFile == "" {
		if _, err = os.Stat("karma.yaml"); !os.IsNotExist(err) {
			configFile = "karma.yaml"
		}
	}
	if configFile != "" {
		log.Infof("Reading configuration file %s", configFile)
		v.SetConfigFile(configFile)
	}

	err = v.ReadInConfig()
	if v.ConfigFileUsed() != "" && err != nil {
		log.Fatal(err)
	}

	config.Alertmanager.Servers = []alertmanagerConfig{}
	config.Alertmanager.Interval = v.GetDuration("alertmanager.interval")
	config.Annotations.Default.Hidden = v.GetBool("annotations.default.hidden")
	config.Annotations.Hidden = v.GetStringSlice("annotations.hidden")
	config.Annotations.Visible = v.GetStringSlice("annotations.visible")
	config.Annotations.Keep = v.GetStringSlice("annotations.keep")
	config.Annotations.Strip = v.GetStringSlice("annotations.strip")
	config.Custom.CSS = v.GetString("custom.css")
	config.Custom.JS = v.GetString("custom.js")
	config.Debug = v.GetBool("debug")
	config.Filters.Default = v.GetStringSlice("filters.default")
	config.Grid.Sorting.Order = v.GetString("grid.sorting.order")
	config.Grid.Sorting.Reverse = v.GetBool("grid.sorting.reverse")
	config.Grid.Sorting.Label = v.GetString("grid.sorting.label")
	config.Karma.Name = v.GetString("karma.name")
	config.Labels.Color.Custom = CustomLabelColors{}
	config.Labels.Color.Static = v.GetStringSlice("labels.color.static")
	config.Labels.Color.Unique = v.GetStringSlice("labels.color.unique")
	config.Labels.Keep = v.GetStringSlice("labels.keep")
	config.Labels.Strip = v.GetStringSlice("labels.strip")
	config.Listen.Address = v.GetString("listen.address")
	config.Listen.Port = v.GetInt("listen.port")
	config.Listen.Prefix = v.GetString("listen.prefix")
	config.Log.Config = v.GetBool("log.config")
	config.Log.Level = v.GetString("log.level")
	config.Log.Format = v.GetString("log.format")
	config.Receivers.Keep = v.GetStringSlice("receivers.keep")
	config.Receivers.Strip = v.GetStringSlice("receivers.strip")
	config.Sentry.Private = v.GetString("sentry.private")
	config.Sentry.Public = v.GetString("sentry.public")
	config.SilenceForm.Strip.Labels = v.GetStringSlice("silenceform.strip.labels")
	config.SilenceForm.Author.PopulateFromHeader.Header = v.GetString("silenceform.author.populate_from_header.header")
	config.SilenceForm.Author.PopulateFromHeader.ValueRegex = v.GetString("silenceform.author.populate_from_header.value_re")

	if config.SilenceForm.Author.PopulateFromHeader.ValueRegex != "" {
		_, err = regexp.Compile(config.SilenceForm.Author.PopulateFromHeader.ValueRegex)
		if err != nil {
			log.Fatalf("Invalid regex for silenceform.author.populate_from_header.value_re: %s", err.Error())
		}
	}

	err = v.UnmarshalKey("alertmanager.servers", &config.Alertmanager.Servers)
	if err != nil {
		log.Fatal(err)
	}
	for i, s := range config.Alertmanager.Servers {
		if s.Timeout.Seconds() == 0 {
			config.Alertmanager.Servers[i].Timeout = v.GetDuration("alertmanager.timeout")
		}
	}

	err = v.UnmarshalKey("jira", &config.JIRA)
	if err != nil {
		log.Fatal(err)
	}

	err = v.UnmarshalKey("labels.color.custom", &config.Labels.Color.Custom)
	if err != nil {
		log.Fatal(err)
	}
	for labelName, customColors := range config.Labels.Color.Custom {
		for i, customColor := range customColors {
			if customColor.Value == "" && customColor.ValueRegex == "" {
				log.Fatalf("Custom label color for '%s' is missing 'value' or 'value_re'", labelName)
			}
			if customColor.ValueRegex != "" {
				config.Labels.Color.Custom[labelName][i].CompiledRegex, err = regexp.Compile(customColor.ValueRegex)
				if err != nil {
					log.Fatalf("Failed to parse custom color regex rule '%s' for '%s' label: %s", customColor.ValueRegex, labelName, err)
				}
			}
		}
	}

	err = v.UnmarshalKey("grid.sorting.customValues.labels", &config.Grid.Sorting.CustomValues.Labels)
	if err != nil {
		log.Fatal(err)
	}

	if !slices.StringInSlice([]string{"disabled", "startsAt", "label"}, config.Grid.Sorting.Order) {
		log.Fatalf("Invalid grid.sorting.order value '%s', allowed options: disabled, startsAt, label", config.Grid.Sorting.Order)
	}

	// FIXME workaround  for https://github.com/prymitive/karma/issues/507
	// until https://github.com/spf13/viper/pull/635 is merged
	// read in raw config file if it's used and override maps where keys are label
	// names so we can't enforce parsed config key names
	if v.ConfigFileUsed() != "" {
		raw := configSchema{}

		var rawConfigFile []byte
		rawConfigFile, err = ioutil.ReadFile(v.ConfigFileUsed())
		if err != nil {
			log.Fatal(err)
		}

		err = yaml.Unmarshal(rawConfigFile, &raw)
		if err != nil {
			log.Fatal(err)
		}

		config.Grid.Sorting.CustomValues.Labels = raw.Grid.Sorting.CustomValues.Labels
	}

	// accept single Alertmanager server from flag/env if nothing is set yet
	if len(config.Alertmanager.Servers) == 0 && v.GetString("alertmanager.uri") != "" {
		log.Info("Using simple config with a single Alertmanager server")
		config.Alertmanager.Servers = []alertmanagerConfig{
			{
				Name:        v.GetString("alertmanager.name"),
				URI:         v.GetString("alertmanager.uri"),
				ExternalURI: v.GetString("alertmanager.external_uri"),
				Timeout:     v.GetDuration("alertmanager.timeout"),
				Proxy:       v.GetBool("alertmanager.proxy"),
				Headers:     make(map[string]string),
			},
		}
	}
}

// LogValues will dump runtime config to logs
func (config *configSchema) LogValues() {
	// make a copy of our config so we can edit it
	cfg := configSchema(*config)

	// replace passwords in Alertmanager URIs with 'xxx'
	servers := []alertmanagerConfig{}
	for _, s := range cfg.Alertmanager.Servers {
		server := alertmanagerConfig{
			Name:        s.Name,
			URI:         uri.SanitizeURI(s.URI),
			ExternalURI: uri.SanitizeURI(s.ExternalURI),
			Timeout:     s.Timeout,
			TLS:         s.TLS,
			Proxy:       s.Proxy,
			Headers:     s.Headers,
		}
		servers = append(servers, server)
	}
	cfg.Alertmanager.Servers = servers

	// replace secret in Sentry DNS with 'xxx'
	if config.Sentry.Private != "" {
		config.Sentry.Private = uri.SanitizeURI(config.Sentry.Private)
	}

	out, err := yaml.Marshal(cfg)
	if err != nil {
		log.Error(err)
	}

	log.Info("Parsed configuration:")
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		log.Info(scanner.Text())
	}
}
