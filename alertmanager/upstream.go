package alertmanager

import (
	"fmt"
	"sync"
	"time"

	"github.com/cloudflare/unsee/models"
	"github.com/prometheus/client_golang/prometheus"

	log "github.com/sirupsen/logrus"
)

var (
	upstreams = map[string]*Alertmanager{}
)

// NewAlertmanager creates a new Alertmanager instance
func NewAlertmanager(name, uri string, timeout time.Duration) error {
	if _, found := upstreams[name]; found {
		return fmt.Errorf("Alertmanager upstream '%s' already exist", name)
	}

	for _, am := range upstreams {
		if am.URI == uri {
			return fmt.Errorf("Alertmanager upstream '%s' already collects from '%s'", am.Name, am.URI)
		}
	}

	// initialize metrics
	metricAlertmanagerErrors.With(prometheus.Labels{
		"alertmanager": name,
		"endpoint":     "alerts",
	}).Set(0)
	metricAlertmanagerErrors.With(prometheus.Labels{
		"alertmanager": name,
		"endpoint":     "silences",
	}).Set(0)

	upstreams[name] = &Alertmanager{
		URI:          uri,
		Timeout:      timeout,
		Name:         name,
		lock:         sync.RWMutex{},
		alertGroups:  []models.AlertGroup{},
		silences:     map[string]models.Silence{},
		colors:       models.LabelsColorMap{},
		autocomplete: []models.Autocomplete{},
	}

	log.Infof("[%s] Configured Alertmanager source at %s", name, uri)

	return nil
}

// GetAlertmanagers returns a list of all defined Alertmanager instances
func GetAlertmanagers() []*Alertmanager {
	ams := []*Alertmanager{}
	for _, am := range upstreams {
		ams = append(ams, am)
	}
	return ams
}

// GetAlertmanagerByName returns an instance of Alertmanager by name or nil
// if not found
func GetAlertmanagerByName(name string) *Alertmanager {
	am, found := upstreams[name]
	if found {
		return am
	}
	return nil
}
