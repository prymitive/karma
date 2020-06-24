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
		sortReverse bool
		sorted      []models.APIAlertGroup
	}

	g1 := models.AlertGroup{
		ID:             "1",
		LatestStartsAt: time.Date(2020, time.January, 1, 0, 0, 0, 1, time.UTC),
	}
	g2 := models.AlertGroup{
		ID:             "2",
		LatestStartsAt: time.Date(2020, time.January, 1, 0, 0, 0, 2, time.UTC),
	}
	g3 := models.AlertGroup{
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
			groups: []models.APIAlertGroup{
				{AlertGroup: g1},
				{AlertGroup: g2},
				{AlertGroup: g3},
			},
			sorted: []models.APIAlertGroup{
				{AlertGroup: g1},
				{AlertGroup: g2},
				{AlertGroup: g3},
			},
		},
		{
			groups: []models.APIAlertGroup{
				{AlertGroup: g1},
				{AlertGroup: g2},
				{AlertGroup: g3},
			},
			sortReverse: true,
			sorted: []models.APIAlertGroup{
				{AlertGroup: g3},
				{AlertGroup: g2},
				{AlertGroup: g1},
			},
		},
		{
			groups: []models.APIAlertGroup{
				{AlertGroup: g2},
				{AlertGroup: g3},
				{AlertGroup: g1},
			},
			sorted: []models.APIAlertGroup{
				{AlertGroup: g1},
				{AlertGroup: g2},
				{AlertGroup: g3},
			},
		},
		{
			groups: []models.APIAlertGroup{
				{AlertGroup: g2},
				{AlertGroup: g3},
				{AlertGroup: g1},
			},
			sortReverse: true,
			sorted: []models.APIAlertGroup{
				{AlertGroup: g3},
				{AlertGroup: g2},
				{AlertGroup: g1},
			},
		},
	}

	for _, testCase := range testCases {
		testCase := testCase
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
