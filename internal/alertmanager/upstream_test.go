package alertmanager

import (
	"net/http"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/config"
)

type testCase struct {
	config     config.AlertmanagerConfig
	shouldFail bool
}

var testCases = []testCase{
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "http://localhost:9093",
			ExternalURI: "http://localhost:9093",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    false,
			Headers:     map[string]string{},
		},
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "proxy",
			URI:         "http://localhost:9094",
			ExternalURI: "http://localhost:9094",
			Timeout:     time.Second * 30,
			Proxy:       true,
			ReadOnly:    false,
			Headers:     map[string]string{},
		},
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "http://localhost:9095",
			ExternalURI: "http://localhost:9095",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    true,
			Headers:     map[string]string{},
		},
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "%gh&%ij",
			ExternalURI: "http://localhost:9095",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    true,
			Headers:     map[string]string{},
		},
		shouldFail: true,
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "http://localhost:9095",
			ExternalURI: "%gh&%ij",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    true,
			Headers:     map[string]string{},
		},
		shouldFail: true,
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "http://localhost:9093",
			ExternalURI: "http://localhost:9093",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    false,
			Headers:     map[string]string{},
			Healthcheck: config.AlertmanagerHealthcheck{
				Filters: map[string][]string{
					"prom1": {"@age>a"},
				},
			},
		},
		shouldFail: true,
	},
	{
		config: config.AlertmanagerConfig{
			Cluster:     "cluster",
			Name:        "name",
			URI:         "http://localhost:9093",
			ExternalURI: "http://localhost:9093",
			Timeout:     time.Second * 30,
			Proxy:       false,
			ReadOnly:    false,
			Headers:     map[string]string{},
			Healthcheck: config.AlertmanagerHealthcheck{
				Filters: map[string][]string{
					"prom1": {" "},
				},
			},
		},
		shouldFail: true,
	},
}

func TestOptions(t *testing.T) {
	for _, tc := range testCases {
		var httpTransport http.RoundTripper
		var err error
		if tc.config.TLS.CA != "" || tc.config.TLS.Cert != "" || tc.config.TLS.InsecureSkipVerify {
			httpTransport, err = NewHTTPTransport(tc.config.TLS.CA, tc.config.TLS.Cert, tc.config.TLS.Key, tc.config.TLS.InsecureSkipVerify)
			if err != nil {
				t.Errorf("Failed to create HTTP transport for Alertmanager '%s' with URI '%s': %s", tc.config.Name, tc.config.URI, err)
			}
		}

		am, err := NewAlertmanager(
			tc.config.Cluster,
			tc.config.Name,
			tc.config.URI,
			WithExternalURI(tc.config.ExternalURI),
			WithRequestTimeout(tc.config.Timeout),
			WithProxy(tc.config.Proxy),
			WithReadOnly(tc.config.ReadOnly),
			WithHTTPTransport(httpTransport), // we will pass a nil unless TLS.CA or TLS.Cert is set
			WithHTTPHeaders(tc.config.Headers),
			WithCORSCredentials(tc.config.CORS.Credentials),
			WithHealthchecks(tc.config.Healthcheck.Filters),
		)
		didFail := err != nil
		if didFail != tc.shouldFail {
			t.Errorf("Alertmanager '%s' error mismatch, shouldFail=%v, err=%v", tc.config.Name, tc.shouldFail, err)
		}
		if err != nil {
			t.Logf("Alertmanager '%s' returned an error: %v", tc.config.Name, err)
			continue
		}
		if am.Name != tc.config.Name {
			t.Errorf("AlertmanagerConfig with name '%s' returned Alertmanager with name '%s'", tc.config.Name, am.Name)
		}
		if am.URI != tc.config.URI {
			t.Errorf("AlertmanagerConfig with name '%s' and URI '%s' returned Alertmanager with URI '%s'", tc.config.Name, tc.config.URI, am.URI)
		}
		if am.ProxyRequests != tc.config.Proxy {
			t.Errorf("AlertmanagerConfig with name '%s' and proxy '%v' returned Alertmanager with proxy '%v'", tc.config.Name, tc.config.Proxy, am.ProxyRequests)
		}
		if am.ReadOnly != tc.config.ReadOnly {
			t.Errorf("AlertmanagerConfig with name '%s' and readonly '%v' returned Alertmanager with readonly '%v'", tc.config.Name, tc.config.ReadOnly, am.ReadOnly)
		}
		if am.CORSCredentials != tc.config.CORS.Credentials {
			t.Errorf("AlertmanagerConfig with name '%s' and cors:credentials '%v' returned Alertmanager with cors:credentials '%v'", tc.config.Name, tc.config.CORS.Credentials, am.CORSCredentials)
		}
	}
}
