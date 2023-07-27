package filters_test

import (
	"fmt"
	"sort"
	"testing"

	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"

	"github.com/google/go-cmp/cmp"
)

type acTest struct {
	Alerts   []models.Alert
	Expected []string
}

var acTests = []acTest{
	{
		Alerts: []models.Alert{},
		Expected: []string{
			"@age\u003e1h",
			"@age\u003c10m",
			"@age\u003c1h",
			"@age\u003e10m",
			"@inhibited=false",
			"@inhibited=true",
			"@limit=10",
			"@limit=50",
		},
	},
	{
		Alerts: []models.Alert{
			{
				State: models.AlertStateActive,
				Labels: models.Labels{
					{Name: "foo", Value: "bar"},
					{Name: "number", Value: "1"},
				},
				Receiver: "default",
				Alertmanager: []models.AlertmanagerInstance{
					{Cluster: "cluster", Name: "am1"},
					{Cluster: "cluster", Name: "am2"},
				},
			},
			{
				State: models.AlertStateSuppressed,
				Labels: models.Labels{
					{Name: "foo", Value: "bar baz"},
					{Name: "number", Value: "5"},
				},
				Receiver: "not default",
				Alertmanager: []models.AlertmanagerInstance{
					{Cluster: "cluster", Name: "am1"},
					{
						Cluster:     "cluster",
						Name:        "am2",
						SilencedBy:  []string{"1234567890"},
						InhibitedBy: []string{"1234567890"},
						Silences: map[string]*models.Silence{
							"1234567890": {
								ID:        "1234567890",
								CreatedBy: "me@example.com",
								TicketID:  "JIRA-1",
							},
						},
					},
				},
				SilencedBy: []string{"1234567890"},
			},
		},
		Expected: []string{
			"@age\u003c10m",
			"@age\u003c1h",
			"@age\u003e10m",
			"@age\u003e1h",
			"@alertmanager!=am1",
			"@alertmanager!=am2",
			"@alertmanager=am1",
			"@alertmanager=am2",
			"@cluster!=cluster",
			"@cluster=cluster",
			"@inhibited=false",
			"@inhibited=true",
			"@inhibited_by!=1234567890",
			"@inhibited_by=1234567890",
			"@limit=10",
			"@limit=50",
			"@receiver!=default",
			"@receiver!=not default",
			"@receiver!~default",
			"@receiver!~not",
			"@receiver=default",
			"@receiver=not default",
			"@receiver=~default",
			"@receiver=~not",
			"@silence_author!=me@example.com",
			"@silence_author!~me@example.com",
			"@silence_author=me@example.com",
			"@silence_author=~me@example.com",
			"@silenced_by!=1234567890",
			"@silenced_by=1234567890",
			"@silence_ticket!=JIRA-1",
			"@silence_ticket!~JIRA-1",
			"@silence_ticket=JIRA-1",
			"@silence_ticket=~JIRA-1",
			"@state!=active",
			"@state!=suppressed",
			"@state=active",
			"@state=suppressed",
			"foo!=bar",
			"foo!=bar baz",
			"foo!~bar",
			"foo!~baz",
			"foo=bar",
			"foo=bar baz",
			"foo=~bar",
			"foo=~baz",
			"number!=1",
			"number!=5",
			"number\u003c1",
			"number\u003c5",
			"number=1",
			"number=5",
			"number\u003e1",
			"number\u003e5",
		},
	},
}

func TestBuildAutocomplete(t *testing.T) {
	for _, acTest := range acTests {
		result := []string{}
		for _, hint := range filters.BuildAutocomplete(acTest.Alerts) {
			result = append(result, hint.Value)
		}

		sort.Strings(result)
		sort.Strings(acTest.Expected)

		if diff := cmp.Diff(acTest.Expected, result); diff != "" {
			t.Errorf("Wrong autocomplete data returned (-want +got):\n%s", diff)
		}
	}
}

func BenchmarkAutocomplete(b *testing.B) {
	const n = 10000
	alerts := make([]models.Alert, 0, n)
	for i := 0; i < n; i++ {
		alerts = append(alerts, models.Alert{
			State: models.AlertStateActive,
			Labels: models.Labels{
				{Name: "foo", Value: fmt.Sprintf("xxx%d", i)},
				{Name: "number", Value: fmt.Sprintf("%d", i)},
			},
			Receiver: fmt.Sprintf("receiver-%d", i%1000),
			Alertmanager: []models.AlertmanagerInstance{
				{Cluster: "cluster", Name: "am1"},
				{Cluster: "cluster", Name: "am2"},
			},
		})
	}
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		filters.BuildAutocomplete(alerts)
	}
}
