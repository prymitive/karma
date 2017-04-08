package models_test

import (
	"sort"
	"testing"
	"time"

	"github.com/cloudflare/unsee/models"
)

type alertListSortTest struct {
	startsAt    time.Time
	fingerprint string
	position    int
}

var alertListSortTests = []alertListSortTest{
	alertListSortTest{
		startsAt:    time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC),
		fingerprint: "abcdefg",
		position:    0,
	},
	alertListSortTest{
		startsAt:    time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC),
		fingerprint: "bbbbbb",
		position:    1,
	},
	alertListSortTest{
		startsAt:    time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC),
		fingerprint: "cdfddfg",
		position:    2,
	},
	alertListSortTest{
		startsAt:    time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC),
		fingerprint: "xlfjdf",
		position:    6,
	},
	alertListSortTest{
		startsAt:    time.Date(2016, time.December, 10, 0, 0, 0, 0, time.UTC),
		fingerprint: "011m",
		position:    4,
	},
	alertListSortTest{
		startsAt:    time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC),
		fingerprint: "cxzfg",
		position:    3,
	},
	alertListSortTest{
		startsAt:    time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC),
		fingerprint: "abv",
		position:    5,
	},
}

func TestUnseeAlertListSort(t *testing.T) {
	al := models.AlertList{}
	for _, testCase := range alertListSortTests {
		a := models.Alert{}
		a.StartsAt = testCase.startsAt
		a.Fingerprint = testCase.fingerprint
		al = append(al, a)
	}

	// repeat sort 100 times to ensure we're always sorting same way
	iterations := 100
	failures := 0
	for i := 1; i <= iterations; i++ {
		sort.Sort(al)
		for _, testCase := range alertListSortTests {
			if al[testCase.position].Fingerprint != testCase.fingerprint {
				failures++
			}
		}
	}
	if failures > 0 {
		t.Errorf("%d sort failures for %d checks", failures, iterations*len(al))
	}
}
