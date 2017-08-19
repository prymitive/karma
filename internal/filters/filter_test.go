package filters_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/alertmanager"
	"github.com/cloudflare/unsee/internal/filters"
	"github.com/cloudflare/unsee/internal/models"

	log "github.com/sirupsen/logrus"
)

type filterTest struct {
	Expression string
	IsValid    bool
	Alert      models.Alert
	Silence    models.Silence
	IsMatch    bool
}

var tests = []filterTest{
	filterTest{
		Expression: "@state=active",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@state!=active",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@state!=suppressed",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@state=xx",
		IsValid:    false,
	},
	filterTest{
		Expression: "@state=:xx",
		IsValid:    false,
	},
	filterTest{
		Expression: "@state==xx",
		IsValid:    false,
	},
	filterTest{
		Expression: "@state=~true",
		IsValid:    false,
	},
	filterTest{
		Expression: "@state=~false",
		IsValid:    false,
	},
	filterTest{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", InhibitedBy: []string{"999"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert:      models.Alert{State: "active"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@state!=suppressed",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", InhibitedBy: []string{"999"}},
		IsMatch:    false,
	},

	filterTest{
		Expression: "@silence_jira=1",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "1"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=2",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira!=3",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "x"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira!=4",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "4"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira!=5",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=~abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "xxabcxx"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_jira=~abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "xxx"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira=~",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "xxx"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira~=",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "xxx"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_jira~=1",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", JiraID: "xxx"},
		IsMatch:    false,
	},

	filterTest{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", CreatedBy: "john"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", CreatedBy: "bob"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", CreatedBy: "bob"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", CreatedBy: "john"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@silence_author=~",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author===x",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@silence_author=!!xxx",
		IsValid:    false,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1"},
		IsMatch:    false,
	},

	filterTest{
		Expression: "@age<1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age>1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Hour * -2)},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age<-1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age>-1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Hour * -2)},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@age=1h",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@age=~1h",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@age>",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@age<",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@age>a",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@age<10v",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},

	filterTest{
		Expression: "node=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node=vps1",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps2"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node=~vps",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node!~vps",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node!~abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "node!~",
		IsValid:    false,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node=",
		IsValid:    false,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "node===",
		IsValid:    false,
		Alert:      models.Alert{Labels: map[string]string{"node": "vps1"}},
		IsMatch:    false,
	},

	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"key": "abc"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"key": "XXXabcx"}},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: map[string]string{"abc": "xxxab"}},
		IsMatch:    false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "key", Value: "abc"},
			},
		},
		IsMatch: true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "key", Value: "ccc abc"},
			},
		},
		IsMatch: true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "abc", Value: "zzz"},
			},
		},
		IsMatch: false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", Comment: "abc"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", Comment: "abcxxx"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", Comment: "ABCD"},
		IsMatch:    true,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{State: "suppressed", SilencedBy: []string{"1"}},
		Silence:    models.Silence{ID: "1", Comment: "xzc"},
		IsMatch:    false,
	},
	filterTest{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "^abb[****].*****",
		IsValid:    false,
	},
	filterTest{
		Expression: "@silenced=true",
		IsValid:    false,
	},
	filterTest{
		Expression: "@silenced!=false",
		IsValid:    false,
	},
	filterTest{
		Expression: "@silenced=~false",
		IsValid:    false,
	},
	filterTest{
		Expression: "@inhibited=true",
		IsValid:    false,
	},
	filterTest{
		Expression: "@inhibited!=false",
		IsValid:    false,
	},
	filterTest{
		Expression: "@inhibited=~false",
		IsValid:    false,
	},
	filterTest{
		Expression: "@alertmanager=test",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@alertmanager=abc",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@alertmanager=~tes",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@alertmanager=~000",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    false,
	},
	filterTest{
		Expression: "@alertmanager!=tes",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    true,
	},
	filterTest{
		Expression: "@alertmanager!~abc",
		IsValid:    true,
		Alert:      models.Alert{},
		IsMatch:    true,
	},
}

func TestFilters(t *testing.T) {
	log.SetLevel(log.ErrorLevel)

	err := alertmanager.NewAlertmanager("test", "http://localhost", time.Second)
	am := alertmanager.GetAlertmanagerByName("test")
	if err != nil {
		t.Error(err)
	}
	for _, ft := range tests {
		alert := models.Alert(ft.Alert)
		if &ft.Silence != nil {
			alert.Alertmanager = []models.AlertmanagerInstance{
				models.AlertmanagerInstance{
					Name: am.Name,
					URI:  am.URI,
					Silences: map[string]models.Silence{
						ft.Silence.ID: ft.Silence,
					},
				},
			}
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
			m := f.Match(&alert, 0)
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
	limitFilterTest{
		Expression: "@limit==0",
		IsValid:    false,
	},
	limitFilterTest{
		Expression: "@limit>0",
		IsValid:    false,
	},
	limitFilterTest{
		Expression: "@limit<0",
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
			alert := models.Alert{}
			var index int
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
