package alertmanager

import (
	"sync"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
)

func TestMergeAutocompleteHintNewEntry(t *testing.T) {
	// verifies that a new hint is appended to the result slice
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Value != "foo=bar" {
		t.Errorf("expected Value %q, got %q", "foo=bar", result[0].Value)
	}
	if len(result[0].Tokens) != 2 {
		t.Errorf("expected 2 tokens, got %d", len(result[0].Tokens))
	}
	if idx, ok := index["foo=bar"]; !ok || idx != 0 {
		t.Errorf("expected index[\"foo=bar\"] == 0, got %d (ok=%v)", idx, ok)
	}
}

func TestMergeAutocompleteHintDuplicateTokens(t *testing.T) {
	// verifies that duplicate tokens from a second upstream are not appended
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})
	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result after merge, got %d", len(result))
	}
	if len(result[0].Tokens) != 2 {
		t.Errorf("expected 2 tokens after merge with identical tokens, got %d", len(result[0].Tokens))
	}
}

func TestMergeAutocompleteHintNewTokens(t *testing.T) {
	// verifies that new tokens from a second upstream are appended
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})
	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"extra_token"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result after merge, got %d", len(result))
	}
	expected := []string{"foo", "foo=bar", "extra_token"}
	if len(result[0].Tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(result[0].Tokens), result[0].Tokens)
	}
	for i, tok := range expected {
		if result[0].Tokens[i] != tok {
			t.Errorf("token[%d] = %q, want %q", i, result[0].Tokens[i], tok)
		}
	}
}

// withUpstreams temporarily replaces the global upstreams map for testing,
// restoring the original after the test function returns.
func withUpstreams(t *testing.T, ams map[string]*Alertmanager) {
	t.Helper()
	saved := upstreams
	upstreams = ams
	t.Cleanup(func() { upstreams = saved })
}

func makeTestAM(name string, groups []models.AlertGroup) *Alertmanager {
	am := &Alertmanager{
		Name:        name,
		Cluster:     "test",
		lock:        sync.RWMutex{},
		alertGroups: groups,
	}
	return am
}

func TestDedupAlertsStartsAtMerge(t *testing.T) {
	// verifies that when two upstreams report the same alert with different
	// StartsAt values, the earliest one is kept
	later := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
	earlier := time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)
	lbls := labels.FromStrings("alertname", "test")

	am1 := makeTestAM("am1", []models.AlertGroup{
		{
			ID:     "group1",
			Labels: lbls,
			Alerts: models.AlertList{
				{
					Labels:   lbls,
					StartsAt: later,
					State:    models.AlertStateActive,
					Alertmanager: []models.AlertmanagerInstance{
						{Name: "am1", State: models.AlertStateActive},
					},
				},
			},
		},
	})
	am2 := makeTestAM("am2", []models.AlertGroup{
		{
			ID:     "group1",
			Labels: lbls,
			Alerts: models.AlertList{
				{
					Labels:   lbls,
					StartsAt: earlier,
					State:    models.AlertStateActive,
					Alertmanager: []models.AlertmanagerInstance{
						{Name: "am2", State: models.AlertStateActive},
					},
				},
			},
		},
	})

	withUpstreams(t, map[string]*Alertmanager{"am1": am1, "am2": am2})
	groups := DedupAlerts()

	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if len(groups[0].Alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(groups[0].Alerts))
	}
	if !groups[0].Alerts[0].StartsAt.Equal(earlier) {
		t.Errorf("StartsAt = %v, want %v", groups[0].Alerts[0].StartsAt, earlier)
	}
}

func TestDedupAlertsUnprocessedState(t *testing.T) {
	// verifies that when all instances of an alert are in unprocessed state,
	// the deduped alert gets AlertStateUnprocessed
	lbls := labels.FromStrings("alertname", "test")

	am1 := makeTestAM("am1", []models.AlertGroup{
		{
			ID:     "group1",
			Labels: lbls,
			Alerts: models.AlertList{
				{
					Labels:   lbls,
					StartsAt: time.Now(),
					State:    models.AlertStateUnprocessed,
					Alertmanager: []models.AlertmanagerInstance{
						{Name: "am1", State: models.AlertStateUnprocessed},
					},
				},
			},
		},
	})
	am2 := makeTestAM("am2", []models.AlertGroup{
		{
			ID:     "group1",
			Labels: lbls,
			Alerts: models.AlertList{
				{
					Labels:   lbls,
					StartsAt: time.Now(),
					State:    models.AlertStateUnprocessed,
					Alertmanager: []models.AlertmanagerInstance{
						{Name: "am2", State: models.AlertStateUnprocessed},
					},
				},
			},
		},
	})

	withUpstreams(t, map[string]*Alertmanager{"am1": am1, "am2": am2})
	groups := DedupAlerts()

	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if len(groups[0].Alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(groups[0].Alerts))
	}
	if groups[0].Alerts[0].State != models.AlertStateUnprocessed {
		t.Errorf("State = %v, want %v", groups[0].Alerts[0].State, models.AlertStateUnprocessed)
	}
}

func TestDedupAlertsHealthcheckSkip(t *testing.T) {
	// verifies that alerts matching a healthcheck filter are dropped
	// when healthchecksVisible is false
	lbls := labels.FromStrings("alertname", "Watchdog")

	hcFilter := filters.NewFilter("alertname=Watchdog")

	am := &Alertmanager{
		Name:    "am1",
		Cluster: "test",
		lock:    sync.RWMutex{},
		healthchecks: map[string]HealthCheck{
			"prom1": {
				filters: []filters.Filter{hcFilter},
			},
		},
		healthchecksVisible: false,
		alertGroups: []models.AlertGroup{
			{
				ID:     "group1",
				Labels: lbls,
				Alerts: models.AlertList{
					{
						Labels:   lbls,
						StartsAt: time.Now(),
						State:    models.AlertStateActive,
						Alertmanager: []models.AlertmanagerInstance{
							{Name: "am1", State: models.AlertStateActive},
						},
					},
				},
			},
		},
	}

	withUpstreams(t, map[string]*Alertmanager{"am1": am})
	groups := DedupAlerts()

	if len(groups) != 0 {
		t.Errorf("expected 0 groups after healthcheck filtering, got %d", len(groups))
	}
}
