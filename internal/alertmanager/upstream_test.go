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

func saveUpstreams() map[string]*Alertmanager {
	saved := make(map[string]*Alertmanager, len(upstreams))
	for k, v := range upstreams {
		saved[k] = v
	}
	return saved
}

func restoreUpstreams(saved map[string]*Alertmanager) {
	upstreams = saved
}

func TestUnregisterAll(t *testing.T) {
	// verifies that UnregisterAll removes all registered instances
	saved := saveUpstreams()
	defer restoreUpstreams(saved)

	am, err := NewAlertmanager("cluster", "unreg-test", "http://localhost")
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	_ = RegisterAlertmanager(am)
	UnregisterAll()
	ams := GetAlertmanagers()
	if len(ams) != 0 {
		t.Errorf("Expected 0 alertmanagers after UnregisterAll, got %d", len(ams))
	}
}

func TestRegisterAlertmanagerDuplicate(t *testing.T) {
	// verifies that registering the same name twice returns an error
	saved := saveUpstreams()
	defer restoreUpstreams(saved)
	UnregisterAll()

	am, err := NewAlertmanager("cluster", "dup-test", "http://localhost")
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	if regErr := RegisterAlertmanager(am); regErr != nil {
		t.Fatalf("First RegisterAlertmanager failed: %s", regErr)
	}

	am2, err := NewAlertmanager("cluster", "dup-test", "http://localhost:9094")
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	if err := RegisterAlertmanager(am2); err == nil {
		t.Error("Second RegisterAlertmanager with same name should have returned an error")
	}
}

func TestGetAlertmanagerByName(t *testing.T) {
	saved := saveUpstreams()
	defer restoreUpstreams(saved)
	UnregisterAll()

	am, err := NewAlertmanager("cluster", "lookup-test", "http://localhost")
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	_ = RegisterAlertmanager(am)

	// verifies that a registered instance is found by name
	found := GetAlertmanagerByName("lookup-test")
	if found == nil {
		t.Error("GetAlertmanagerByName returned nil for registered instance")
	}
	if found != nil && found.Name != "lookup-test" {
		t.Errorf("GetAlertmanagerByName returned wrong instance: %s", found.Name)
	}

	// verifies that a non-existent name returns nil
	notFound := GetAlertmanagerByName("does-not-exist")
	if notFound != nil {
		t.Errorf("GetAlertmanagerByName returned non-nil for unregistered name: %s", notFound.Name)
	}
}

func TestWithHealthchecksVisible(t *testing.T) {
	// verifies that WithHealthchecksVisible sets the healthchecksVisible field
	am, err := NewAlertmanager("cluster", "hcv-test", "http://localhost",
		WithHealthchecksVisible(true),
	)
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	if !am.healthchecksVisible {
		t.Error("Expected healthchecksVisible to be true")
	}
}

func TestIsHealthy(t *testing.T) {
	// verifies that a fresh alertmanager with no errors is healthy
	am, err := NewAlertmanager("cluster", "healthy-test", "http://localhost")
	if err != nil {
		t.Fatalf("NewAlertmanager failed: %s", err)
	}
	if !am.IsHealthy() {
		t.Error("Expected fresh alertmanager to be healthy")
	}

	// verifies that setting lastError makes it unhealthy
	am.lock.Lock()
	am.lastError = "something went wrong"
	am.lock.Unlock()
	if am.IsHealthy() {
		t.Error("Expected alertmanager with lastError to be unhealthy")
	}
}

func TestClusterMemberNames(t *testing.T) {
	saved := saveUpstreams()
	defer restoreUpstreams(saved)
	UnregisterAll()

	// register three alertmanagers: two in same cluster, one different
	am1, _ := NewAlertmanager("prod", "am-1", "http://localhost:9091")
	am2, _ := NewAlertmanager("prod", "am-2", "http://localhost:9092")
	am3, _ := NewAlertmanager("staging", "am-3", "http://localhost:9093")
	_ = RegisterAlertmanager(am1)
	_ = RegisterAlertmanager(am2)
	_ = RegisterAlertmanager(am3)

	// verifies that am1 sees itself and am2 as cluster members, but not am3
	members := am1.ClusterMemberNames()
	if len(members) != 2 {
		t.Errorf("Expected 2 cluster members, got %d: %v", len(members), members)
	}
	if members[0] != "am-1" || members[1] != "am-2" {
		t.Errorf("Expected [am-1 am-2], got %v", members)
	}

	// verifies that am3 only sees itself
	members3 := am3.ClusterMemberNames()
	if len(members3) != 1 {
		t.Errorf("Expected 1 cluster member for staging, got %d: %v", len(members3), members3)
	}
	if members3[0] != "am-3" {
		t.Errorf("Expected [am-3], got %v", members3)
	}
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
