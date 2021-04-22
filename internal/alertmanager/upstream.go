package alertmanager

import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"sync"
	"time"

	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"

	"github.com/rs/zerolog/log"
)

// Option allows to pass functional options to NewAlertmanager()
type Option func(am *Alertmanager) error

var (
	upstreams = map[string]*Alertmanager{}
)

// NewAlertmanager creates a new Alertmanager instance
func NewAlertmanager(cluster, name, upstreamURI string, opts ...Option) (*Alertmanager, error) {
	am := &Alertmanager{
		URI:            upstreamURI,
		ExternalURI:    "",
		RequestTimeout: time.Second * 10,
		Cluster:        cluster,
		Name:           name,
		lock:           sync.RWMutex{},
		alertGroups:    []models.AlertGroup{},
		silences:       map[string]models.Silence{},
		colors:         models.LabelsColorMap{},
		autocomplete:   []models.Autocomplete{},
		knownLabels:    []string{},
		HTTPHeaders:    map[string]string{},
		Metrics: alertmanagerMetrics{
			Errors: map[string]float64{
				labelValueErrorsAlerts:   0,
				labelValueErrorsSilences: 0,
			},
		},
		status:       models.AlertmanagerStatus{},
		healthchecks: map[string]healthCheck{},
	}

	for _, opt := range opts {
		err := opt(am)
		if err != nil {
			return nil, err
		}
	}

	var err error
	am.reader, err = uri.NewReader(am.URI, am.RequestTimeout, am.HTTPTransport, am.HTTPHeaders)
	if err != nil {
		return am, err
	}

	return am, nil
}

// UnregisterAll will remove all registered alertmanager instances
func UnregisterAll() {
	upstreams = map[string]*Alertmanager{}
}

// RegisterAlertmanager will add an Alertmanager instance to the list of
// instances used when pulling alerts from upstreams
func RegisterAlertmanager(am *Alertmanager) error {
	if _, found := upstreams[am.Name]; found {
		return fmt.Errorf("alertmanager upstream '%s' already exist", am.Name)
	}

	upstreams[am.Name] = am
	// am.Name, uri.SanitizeURI(am.URI), am.ProxyRequests, am.ReadOnly
	log.Info().
		Str("name", am.Name).
		Str("uri", uri.SanitizeURI(am.URI)).
		Bool("proxy", am.ProxyRequests).
		Bool("readonly", am.ReadOnly).
		Msg("Configured Alertmanager source")
	return nil
}

// GetAlertmanagers returns a list of all defined Alertmanager instances
func GetAlertmanagers() []*Alertmanager {
	ams := make([]*Alertmanager, 0, len(upstreams))
	for _, am := range upstreams {
		ams = append(ams, am)
	}
	sort.Slice(ams[:], func(i, j int) bool {
		return ams[i].Name < ams[j].Name
	})
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

// WithReadOnly option can be passed to NewAlertmanager in order to configure
// it as read-only, in that mode it doesn't allow creating silences via Proxy
func WithReadOnly(readonly bool) Option {
	return func(am *Alertmanager) error {
		am.ReadOnly = readonly
		return nil
	}
}

// WithHTTPHeaders option can be passed to NewAlertManager in order to set
// a map of headers that will be passed with every request
func WithHTTPHeaders(headers map[string]string) Option {
	return func(am *Alertmanager) error {
		am.HTTPHeaders = headers
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

// WithExternalURI option allows to set custom ExternalURI on our instance
func WithExternalURI(uri string) Option {
	return func(am *Alertmanager) error {
		// first validate that this is a valid URI
		_, err := url.Parse(uri)
		if err != nil {
			return err
		}
		am.ExternalURI = uri
		return nil
	}
}

// WithCORSCredentials option sets fetch CORS credentials policy
func WithCORSCredentials(val string) Option {
	return func(am *Alertmanager) error {
		am.CORSCredentials = val
		return nil
	}
}

func WithHealthchecks(val map[string][]string) Option {
	return func(am *Alertmanager) error {
		healthchecks := map[string]healthCheck{}
		for name, filterExpressions := range val {
			hc := healthCheck{
				filters: []filters.FilterT{},
			}
			for _, filterExpression := range filterExpressions {
				f := filters.NewFilter(filterExpression)
				if f == nil || !f.GetIsValid() {
					return fmt.Errorf("%q is not a valid filter", filterExpression)
				}
				hc.filters = append(hc.filters, f)
			}
			healthchecks[name] = hc
		}
		am.healthchecks = healthchecks
		return nil
	}
}

func WithHealthchecksVisible(val bool) Option {
	return func(am *Alertmanager) error {
		am.healthchecksVisible = val
		return nil
	}
}
