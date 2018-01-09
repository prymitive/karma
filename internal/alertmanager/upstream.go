package alertmanager

import (
	"fmt"
	"sync"
	"time"

	"github.com/cloudflare/unsee/internal/models"

	log "github.com/sirupsen/logrus"
)

// Option allows to pass functional options to NewAlertmanager()
type Option func(am *Alertmanager)

var (
	upstreams = map[string]*Alertmanager{}
)

// NewAlertmanager creates a new Alertmanager instance
func NewAlertmanager(name, uri string, opts ...Option) *Alertmanager {
	am := &Alertmanager{
		URI:            uri,
		RequestTimeout: time.Second * 10,
		Name:           name,
		lock:           sync.RWMutex{},
		alertGroups:    []models.AlertGroup{},
		silences:       map[string]models.Silence{},
		colors:         models.LabelsColorMap{},
		autocomplete:   []models.Autocomplete{},
		metrics: alertmanagerMetrics{
			errors: map[string]float64{
				labelValueErrorsAlerts:   0,
				labelValueErrorsSilences: 0,
			},
		},
	}

	for _, opt := range opts {
		opt(am)
	}

	return am
}

// RegisterAlertmanager will add an Alertmanager instance to the list of
// instances used when pulling alerts from upstreams
func RegisterAlertmanager(am *Alertmanager) error {
	if _, found := upstreams[am.Name]; found {
		return fmt.Errorf("Alertmanager upstream '%s' already exist", am.Name)
	}

	for _, existingAM := range upstreams {
		if existingAM.URI == am.URI {
			return fmt.Errorf("Alertmanager upstream '%s' already collects from '%s'", existingAM.Name, existingAM.URI)
		}
	}
	upstreams[am.Name] = am
	log.Infof("[%s] Configured Alertmanager source at %s (proxied: %v)", am.Name, am.URI, am.ProxyRequests)
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

// WithProxy option can be passed to NewAlertmanager in order to enable request
// proxying for unsee clients
func WithProxy(proxied bool) Option {
	return func(am *Alertmanager) {
		am.ProxyRequests = proxied
	}
}

// WithRequestTimeout option can be passed to NewAlertmanager in order to set
// a custom timeout for Alertmanager upstream requests
func WithRequestTimeout(timeout time.Duration) Option {
	return func(am *Alertmanager) {
		am.RequestTimeout = timeout
	}
}
