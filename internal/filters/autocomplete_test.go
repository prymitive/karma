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
				Labels: map[string]string{
					"foo": "bar",
				},
			},
		},
		Expected: []string{
			"@age\u003e1h",
			"@age\u003c10m",
			"@age\u003c1h",
			"@age\u003e10m",
			"@limit=10",
			"@limit=50",
			"@state!=",
			"@state=",
			"foo!=bar",
			"foo=bar",
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
