package main

import (
	"encoding/json"
	"sort"
	"testing"
	"time"

	"github.com/pmezard/go-difflib/difflib"

	"github.com/prymitive/karma/internal/models"
)

func TestSortByStartsAt(t *testing.T) {
	type testCaseT struct {
		groups      []models.APIAlertGroup
		sorted      []models.APIAlertGroup
		sortReverse bool
	}

	g1 := models.APIAlertGroup{
		Receiver:       "default",
		ID:             "1",
		LatestStartsAt: time.Date(2020, time.January, 1, 0, 0, 0, 1, time.UTC),
	}
	g2 := models.APIAlertGroup{
		Receiver:       "default",
		ID:             "2",
		LatestStartsAt: time.Date(2020, time.January, 1, 0, 0, 0, 2, time.UTC),
	}
	g3 := models.APIAlertGroup{
		Receiver:       "default",
		ID:             "3",
		LatestStartsAt: time.Date(2020, time.January, 1, 0, 0, 0, 3, time.UTC),
	}

	testCases := []testCaseT{
		{
			groups: []models.APIAlertGroup{},
			sorted: []models.APIAlertGroup{},
		},
		{
			groups:      []models.APIAlertGroup{},
			sorted:      []models.APIAlertGroup{},
			sortReverse: true,
		},
		{
			groups: []models.APIAlertGroup{g1, g2, g3},
			sorted: []models.APIAlertGroup{g1, g2, g3},
		},
		{
			groups:      []models.APIAlertGroup{g1, g2, g3},
			sortReverse: true,
			sorted:      []models.APIAlertGroup{g3, g2, g1},
		},
		{
			groups: []models.APIAlertGroup{g2, g3, g1},
			sorted: []models.APIAlertGroup{g1, g2, g3},
		},
		{
			groups:      []models.APIAlertGroup{g2, g3, g1},
			sortReverse: true,
			sorted:      []models.APIAlertGroup{g3, g2, g1},
		},
	}

	for _, testCase := range testCases {
		sort.Slice(testCase.groups, func(i, j int) bool {
			return sortByStartsAt(i, j, testCase.groups, testCase.sortReverse)
		})

		gotJSON, _ := json.MarshalIndent(testCase.groups, "", "  ")
		expectedJSON, _ := json.MarshalIndent(testCase.sorted, "", "  ")

		if string(gotJSON) != string(expectedJSON) {
			diff := difflib.UnifiedDiff{
				A:        difflib.SplitLines(string(expectedJSON)),
				B:        difflib.SplitLines(string(gotJSON)),
				FromFile: "Expected",
				ToFile:   "Response",
				Context:  3,
			}
			text, err := difflib.GetUnifiedDiffString(diff)
			if err != nil {
				t.Error(err)
			}
			t.Errorf("Sort result mismatch:\n%s", text)
		}
	}
}
