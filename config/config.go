package config

import (
	"reflect"
	"strings"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/kelseyhightower/envconfig"
)

type spaceSeparatedList []string

func (mvd *spaceSeparatedList) Decode(value string) error {
	*mvd = spaceSeparatedList(strings.Split(value, " "))
	return nil
}

type configEnvs struct {
	Debug               bool               `envconfig:"DEBUG" default:"false"`
	AlertManagerURL     string             `envconfig:"ALERTMANAGER_URI" required:"true"`
	AlertManagerTimeout time.Duration      `envconfig:"ALERTMANAGER_TIMEOUT" default:"40s"`
	UpdateInterval      time.Duration      `envconfig:"UPDATE_INTERVAL" default:"1m"`
	SentryDSN           string             `envconfig:"SENTRY_DSN"`
	SentryPublicDSN     string             `envconfig:"SENTRY_PUBLIC_DSN"`
	DefaultFilter       string             `envconfig:"DEFAULT_FILTER"`
	ColorLabels         spaceSeparatedList `envconfig:"COLOR_LABELS"`
	StaticColorLabels   spaceSeparatedList `envconfig:"STATIC_COLOR_LABELS"`
	StripLabels         spaceSeparatedList `envconfig:"STRIP_LABELS"`
	JIRARegexp          spaceSeparatedList `envconfig:"JIRA_REGEX"`
}

// Config exposes all options required to run
var Config configEnvs

//
func (config *configEnvs) Read() {
	err := envconfig.Process("", config)
	if err != nil {
		log.Fatal(err.Error())
	}

	s := reflect.ValueOf(config).Elem()
	typeOfT := s.Type()
	for i := 0; i < s.NumField(); i++ {
		f := s.Field(i)
		log.Infof("%20s => %v", typeOfT.Field(i).Tag.Get("envconfig"), f.Interface())
	}

}
