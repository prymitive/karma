package alertmanager

import (
	"fmt"
	"sync"
	"time"

	"github.com/cloudflare/unsee/internal/models"

	log "github.com/sirupsen/logrus"
)

var (
	upstreams = map[string]*Alertmanager{}
)

func newAlertmanager(name, uri string, timeout time.Duration, proxyRequests bool) error {
	if _, found := upstreams[name]; found {
		return fmt.Errorf("Alertmanager upstream '%s' already exist", name)
	}

	for _, am := range upstreams {
		if am.URI == uri {
			return fmt.Errorf("Alertmanager upstream '%s' already collects from '%s'", am.Name, am.URI)
		}
	}

	upstreams[name] = &Alertmanager{
		URI:           uri,
		Timeout:       timeout,
		Name:          name,
		ProxyRequests: proxyRequests,
		lock:          sync.RWMutex{},
		alertGroups:   []models.AlertGroup{},
		silences:      map[string]models.Silence{},
		colors:        models.LabelsColorMap{},
		autocomplete:  []models.Autocomplete{},
		metrics: alertmanagerMetrics{
			errors: map[string]float64{
				labelValueErrorsAlerts:   0,
				labelValueErrorsSilences: 0,
			},
		},
	}

	log.Infof("[%s] Configured Alertmanager source at %s", name, uri)

	return nil
}

// NewAlertmanager creates a new Alertmanager instance, unsee clients will talk
// to directly to it without unsee proxying any request
func NewAlertmanager(name, uri string, timeout time.Duration) error {
	return newAlertmanager(name, uri, timeout, false)
}

// NewProxiedAlertmanager creates a new proxied Alertmanager instance, unsee
// clients will talk to it via unsee
func NewProxiedAlertmanager(name, uri string, timeout time.Duration) error {
	return newAlertmanager(name, uri, timeout, false)
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
