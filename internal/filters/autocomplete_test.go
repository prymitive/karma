package filters_test

import (
	"encoding/json"
	"sort"
	"testing"

	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"

	"github.com/pmezard/go-difflib/difflib"
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
			"@limit=10",
			"@limit=50",
		},
	},
	{
		Alerts: []models.Alert{
			models.Alert{
				State: models.AlertStateActive,
				Labels: map[string]string{
					"foo":    "bar",
					"number": "1",
				},
				Receiver: "default",
				Alertmanager: []models.AlertmanagerInstance{
					{Name: "am1"},
					{Name: "am2"},
				},
			},
			models.Alert{
				State: models.AlertStateSuppressed,
				Labels: map[string]string{
					"foo":    "bar baz",
					"number": "5",
				},
				Receiver: "not default",
				Alertmanager: []models.AlertmanagerInstance{
					{Name: "am1"},
					{
						Name: "am2",
						Silences: map[string]*models.Silence{
							"1234567890": &models.Silence{
								ID:        "1234567890",
								CreatedBy: "me@example.com",
								JiraID:    "JIRA-1",
							},
						}},
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
			"@silence_id!=1234567890",
			"@silence_id=1234567890",
			"@silence_jira!=JIRA-1",
			"@silence_jira!~JIRA-1",
			"@silence_jira=JIRA-1",
			"@silence_jira=~JIRA-1",
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

		resultJSON, _ := json.Marshal(result)
		expectedJSON, _ := json.Marshal(acTest.Expected)

		if string(resultJSON) != string(expectedJSON) {
			diff := difflib.UnifiedDiff{
				A:        difflib.SplitLines(string(expectedJSON)),
				B:        difflib.SplitLines(string(resultJSON)),
				FromFile: "Expected",
				ToFile:   "Returned",
				Context:  3,
			}
			text, err := difflib.GetUnifiedDiffString(diff)
			if err != nil {
				t.Error(err)
			}
			t.Errorf("Autocomplete mismatch:\n%s", text)
		}
	}
}
