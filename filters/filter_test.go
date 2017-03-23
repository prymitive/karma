package filters_test

import (
	"encoding/json"
	"strconv"
	"testing"
	"time"
	"github.com/cloudflare/unsee/filters"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
)

type filterTest struct {
	Expression string
	IsValid    bool
	Alert      models.UnseeAlert
	Silence    models.UnseeSilence
	IsMatch    bool
}

var tests = []filterTest{
	filterTest{
		Expression: "@silenced=true",
		IsValid:    true,
		Alert:      models.UnseeAlert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silenced!=true",
		IsValid:    true,
		Alert:      models.UnseeAlert{},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silenced=true",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silenced!=true",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silenced=xx",
		IsValid:    false,
	},

	filterTest{
		Expression: "@silence_jira=1",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}, JiraID: "1"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=2",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira!=3",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}, JiraID: "x"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira!=4",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}, JiraID: "4"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira!=5",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=~abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}, JiraID: "xxabcxx"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=~abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}, JiraID: "xxx"},
		IsMatch:    false,
	},

	filterTest{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, CreatedBy: "john"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, CreatedBy: "bob"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, CreatedBy: "bob"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, CreatedBy: "john"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1}},
		IsMatch:    true,
	},

	filterTest{
		Expression: "@age<1h",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{StartsAt: time.Now().Add(time.Minute * -55)}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age>1h",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{StartsAt: time.Now().Add(time.Hour * -2)}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age<-1h",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{StartsAt: time.Now().Add(time.Minute * -55)}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age>-1h",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{StartsAt: time.Now().Add(time.Hour * -2)}},
		IsMatch:    true,
	},

	filterTest{
		Expression: "node=vps1",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps1"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node=vps1",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps1"}}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps2"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node=~vps",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps1"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node!~vps",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps1"}}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!~abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"node": "vps1"}}},
		IsMatch:    true,
	},

	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"key": "abc"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"key": "XXXabcx"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Labels: map[string]string{"abc": "xxxab"}}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Annotations: map[string]string{"key": "abc"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Annotations: map[string]string{"key": "ccc abc"}}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Annotations: map[string]string{"abc": "zzz"}}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, Comment: "abc"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, Comment: "abcxxx"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, Comment: "ABCD"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{Silenced: 1}},
		Silence:    models.UnseeSilence{AlertManagerSilence: models.AlertManagerSilence{ID: 1, Comment: "xzc"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "^abb[****].*****",
		IsValid:    false,
	},
}

func TestFilters(t *testing.T) {
	for _, ft := range tests {
		if &ft.Silence != nil {
			store.SilenceStore.Store = map[string]models.UnseeSilence{}
			store.SilenceStore.Store[strconv.Itoa(ft.Silence.ID)] = ft.Silence
		} else {
			store.SilenceStore.Store = map[string]models.UnseeSilence{}
		}
		f := filters.NewFilter(ft.Expression)
		if f == nil {
			t.Errorf("[%s] No filter found", ft.Expression)
		}
		if f.GetHits() != 0 {
			t.Errorf("[%s] Hits = %#v after init(), expected 0", ft.Expression, f.GetHits())
		}
		if f.GetIsValid() != ft.IsValid {
			t.Errorf("[%s] GetIsValid() returned %#v while %#v was expected", ft.Expression, f.GetIsValid(), ft.IsValid)
		}
		if f.GetIsValid() {
			m := f.Match(&ft.Alert, 0)
			if m != ft.IsMatch {
				j, _ := json.Marshal(ft.Alert)
				s, _ := json.Marshal(ft.Silence)
				t.Errorf("[%s] Match() returned %#v while %#v was expected\nalert used: %s\nsilence used: %s", ft.Expression, m, ft.IsMatch, j, s)
			}
			if ft.IsMatch && f.GetHits() != 1 {
				t.Errorf("[%s] GetHits() returned %#v after match, expected 1", ft.Expression, f.GetHits())
			}
			if !ft.IsMatch && f.GetHits() != 0 {
				t.Errorf("[%s] GetHits() returned %#v after non-match, expected 0", ft.Expression, f.GetHits())
			}
			if f.GetRawText() != ft.Expression {
				t.Errorf("[%s] GetRawText() returned %#v != %s passed as the expression", ft.Expression, f.GetRawText(), ft.Expression)
			}
		}
	}
}

type limitFilterTest struct {
	Expression string
	IsValid    bool
	IsMatch    []bool
	Hits       int
}

var limitTests = []limitFilterTest{
	limitFilterTest{
		Expression: "@limit=3",
		IsValid:    true,
		IsMatch:    []bool{true, true, true},
		Hits:       0,
	},
	limitFilterTest{
		Expression: "@limit=1",
		IsValid:    true,
		IsMatch:    []bool{true, false, false},
		Hits:       2,
	},
	limitFilterTest{
		Expression: "@limit=5",
		IsValid:    true,
		IsMatch:    []bool{true, true, true, true, true, false, false, false},
		Hits:       3,
	},
	limitFilterTest{
		Expression: "@limit=0",
		IsValid:    false,
	},
	limitFilterTest{
		Expression: "@limit=abc",
		IsValid:    false,
	},
}

func TestLimitFilter(t *testing.T) {
	for _, ft := range limitTests {
		f := filters.NewFilter(ft.Expression)
		if f == nil {
			t.Errorf("[%s] No filter found", ft.Expression)
		}
		if f.GetHits() != 0 {
			t.Errorf("[%s] Hits = %#v after init(), expected 0", ft.Expression, f.GetHits())
		}
		if f.GetIsValid() != ft.IsValid {
			t.Errorf("[%s] GetIsValid() returned %#v while %#v was expected", ft.Expression, f.GetIsValid(), ft.IsValid)
		}
		if f.GetIsValid() {
			alert := models.UnseeAlert{AlertManagerAlert: models.AlertManagerAlert{}}
			var index int = 0
			for _, isMatch := range ft.IsMatch {
				m := f.Match(&alert, index)
				if m != isMatch {
					t.Errorf("[%s] Match() returned %#v while %#v was expected, index %d", ft.Expression, m, isMatch, index)
				}
				if f.GetRawText() != ft.Expression {
					t.Errorf("[%s] GetRawText() returned %#v != %s passed as the expression", ft.Expression, f.GetRawText(), ft.Expression)
				}
				index++
			}
			if f.GetHits() != ft.Hits {
				t.Errorf("[%s] GetHits() returned %#v hits, expected %d", ft.Expression, f.GetHits(), ft.Hits)
			}
		}
	}
}
