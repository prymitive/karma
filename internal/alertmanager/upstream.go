package alertmanager

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"

	log "github.com/sirupsen/logrus"
)

// Option allows to pass functional options to NewAlertmanager()
type Option func(am *Alertmanager) error

var (
	upstreams = map[string]*Alertmanager{}
)

// NewAlertmanager creates a new Alertmanager instance
func NewAlertmanager(name, upstreamURI string, opts ...Option) (*Alertmanager, error) {
	am := &Alertmanager{
		URI:            upstreamURI,
		RequestTimeout: time.Second * 10,
		Name:           name,
		lock:           sync.RWMutex{},
		alertGroups:    []models.AlertGroup{},
		silences:       map[string]models.Silence{},
		colors:         models.LabelsColorMap{},
		autocomplete:   []models.Autocomplete{},
		knownLabels:    []string{},
		metrics: alertmanagerMetrics{
			errors: map[string]float64{
				labelValueErrorsAlerts:   0,
				labelValueErrorsSilences: 0,
			},
		},
		status: alertmanagerStatus{},
	}

	for _, opt := range opts {
		err := opt(am)
		if err != nil {
			return nil, err
		}
	}

	var err error
	am.reader, err = uri.NewReader(am.URI, am.RequestTimeout, am.HTTPTransport)
	if err != nil {
		return am, err
	}

	return am, nil
}

// RegisterAlertmanager will add an Alertmanager instance to the list of
// instances used when pulling alerts from upstreams
func RegisterAlertmanager(am *Alertmanager) error {
	if _, found := upstreams[am.Name]; found {
		return fmt.Errorf("alertmanager upstream '%s' already exist", am.Name)
	}

	for _, existingAM := range upstreams {
		if existingAM.URI == am.URI {
			return fmt.Errorf("alertmanager upstream '%s' already collects from '%s'", existingAM.Name, existingAM.URI)
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
// proxying for karma clients
func WithProxy(proxied bool) Option {
	return func(am *Alertmanager) error {
		am.ProxyRequests = proxied
		return nil
	}
}

// WithRequestTimeout option can be passed to NewAlertmanager in order to set
// a custom timeout for Alertmanager upstream requests
func WithRequestTimeout(timeout time.Duration) Option {
	return func(am *Alertmanager) error {
		am.RequestTimeout = timeout
		return nil
	}
}

// WithHTTPTransport option can be passed to NewAlertmanager in order to set
// a custom HTTP transport (http.RoundTripper implementation)
func WithHTTPTransport(httpTransport http.RoundTripper) Option {
	return func(am *Alertmanager) error {
		am.HTTPTransport = httpTransport
		return nil
	}
}
