package filters_test

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
)

type filterTest struct {
	Alert               models.Alert
	Silence             models.Silence
	Expression          string
	Alertmanagers       []models.AlertmanagerInstance
	IsValid             bool
	IsMatch             bool
	IsAlertmanagerMatch bool
}

var tests = []filterTest{
	{
		Expression: "",
		IsValid:    false,
	},
	{
		Expression: " ",
		IsValid:    false,
	},
	{
		Expression: "\t",
		IsValid:    false,
	},
	{
		Expression: "@state=active",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateUnprocessed,
		},
		IsMatch: false,
	},
	{
		Expression: "@state=active ",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
		IsMatch: false,
	},
	{
		Expression: "@state=active ",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@state!=active",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateUnprocessed,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@state!=suppressed",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		IsMatch: false,
	},
	{
		Expression: "@state=xx",
		IsValid:    false,
	},
	{
		Expression: "@state=:xx",
		IsValid:    false,
	},
	{
		Expression: "@state==xx",
		IsValid:    false,
	},
	{
		Expression: "@state=~true",
		IsValid:    false,
	},
	{
		Expression: "@state=~false",
		IsValid:    false,
	},
	{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"999"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@state=suppressed",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@state!=suppressed",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"999"},
		},
		IsMatch: false,
	},
	{
		Expression: "@state==active",
		IsValid:    false,
	},
	{
		Expression: "@state!!active",
		IsValid:    false,
	},
	{
		Expression: "@state!!",
		IsValid:    false,
	},
	{
		Expression: "@state=",
		IsValid:    false,
	},
	{
		Expression: "@state==",
		IsValid:    false,
	},
	{
		Expression: "@state<=active",
		IsValid:    false,
	},

	{
		Expression: "@fingerprint=",
		IsValid:    false,
	},
	{
		Expression: "@fingerprint==",
		IsValid:    false,
	},
	{
		Expression: "@fingerprint<=active",
		IsValid:    false,
	},
	{
		Expression: "@fingerprint=123",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             false,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@fingerprint!=123",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@fingerprint=1234",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		Alertmanagers: []models.AlertmanagerInstance{
			{Fingerprint: "1234", State: models.AlertStateActive},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@fingerprint=~123",
		IsValid:    false,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
	},
	{
		Expression: "@fingerprint=abc",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		Alertmanagers: []models.AlertmanagerInstance{
			{Fingerprint: "12345", State: models.AlertStateActive},
		},
		IsMatch:             false,
		IsAlertmanagerMatch: false,
	},
	{
		Expression: "@fingerprint!=1a1",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		Alertmanagers: []models.AlertmanagerInstance{
			{Fingerprint: "1a1", State: models.AlertStateActive},
		},
		IsMatch:             false,
		IsAlertmanagerMatch: false,
	},
	{
		Expression: "@fingerprint!=cde",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		Alertmanagers: []models.AlertmanagerInstance{
			{Fingerprint: "abc", State: models.AlertStateActive},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},

	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		IsMatch: false,
	},
	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateActive,
			SilencedBy: []string{"abcdef"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateUnprocessed,
		},
		IsMatch: false,
	},
	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateUnprocessed,
			SilencedBy: []string{"abcdef"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silenced_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"abcdef"},
		},
		Silence:             models.Silence{ID: "abcdef"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silenced_by!=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"abcdef"},
		},
		IsMatch: false,
	},
	{
		Expression: "@silenced_by!=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silenced_by=~cde",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"abcdef"},
		},
	},
	{
		Expression: "@silenced_by!~abc",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"zwd"},
		},
	},

	{
		Expression: "@inhibited=abcdef",
		IsValid:    false,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
	},
	{
		Expression: "@inhibited=true",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
	},
	{
		Expression: "@inhibited=false",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited=true",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"1"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited=false",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"1"},
		},
	},

	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"1"},
		},
		IsMatch: false,
	},
	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateActive,
			InhibitedBy: []string{"abcdef"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateUnprocessed,
		},
		IsMatch: false,
	},
	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateUnprocessed,
			InhibitedBy: []string{"abcdef"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited_by=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"abcdef"},
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited_by!=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"abcdef"},
		},
		IsMatch: false,
	},
	{
		Expression: "@inhibited_by!=abcdef",
		IsValid:    true,
		Alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@inhibited_by=~cde",
		IsValid:    false,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
	},
	{
		Expression: "@inhibited_by!~abc",
		IsValid:    false,
		Alert: models.Alert{
			State: models.AlertStateSuppressed,
		},
	},

	{
		Expression: "@silence_ticket=1",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1", TicketID: "1"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_ticket=1",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive, SilencedBy: []string{},
		},
		IsMatch:             false,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_ticket=2",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1"},
		IsMatch: false,
	},
	{
		Expression: "@silence_ticket!=3",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1", TicketID: "x"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_ticket!=4",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", TicketID: "4"},
		IsMatch: false,
	},
	{
		Expression: "@silence_ticket!=5",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_ticket=~abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1", TicketID: "xxabcxx"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_ticket=~abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", TicketID: "xxx"},
		IsMatch: false,
	},
	{
		Expression: "@silence_ticket=~",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", TicketID: "xxx"},
		IsMatch: false,
	},
	{
		Expression: "@silence_ticket~=",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", TicketID: "xxx"},
		IsMatch: false,
	},
	{
		Expression: "@silence_ticket~=1",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", TicketID: "xxx"},
		IsMatch: false,
	},

	{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1", CreatedBy: "john"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive, SilencedBy: []string{},
		},
		IsMatch: false,
	},
	{
		Expression: "@silence_author=john",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", CreatedBy: "bob"},
		IsMatch: false,
	},
	{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1", CreatedBy: "bob"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", CreatedBy: "john"},
		IsMatch: false,
	},
	{
		Expression: "@silence_author!=john",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence:             models.Silence{ID: "1"},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@silence_author=~",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1"},
		IsMatch: false,
	},
	{
		Expression: "@silence_author===x",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1"},
		IsMatch: false,
	},
	{
		Expression: "@silence_author=!!xxx",
		IsValid:    false,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1"},
		IsMatch: false,
	},

	{
		Expression: "@age<1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    true,
	},
	{
		Expression:          "@age>1h",
		IsValid:             true,
		Alert:               models.Alert{StartsAt: time.Now().Add(time.Hour * -2)},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@age<-1h",
		IsValid:    true,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    true,
	},
	{
		Expression:          "@age>-1h",
		IsValid:             true,
		Alert:               models.Alert{StartsAt: time.Now().Add(time.Hour * -2)},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@age=1h",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	{
		Expression: "@age=~1h",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	{
		Expression: "@age>",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	{
		Expression: "@age<",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	{
		Expression: "@age>a",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},
	{
		Expression: "@age<10v",
		IsValid:    false,
		Alert:      models.Alert{StartsAt: time.Now().Add(time.Minute * -55)},
		IsMatch:    false,
	},

	{
		Expression: "node=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    true,
	},
	{
		Expression: "node=vps1",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    false,
	},
	{
		Expression: "node!=vps1",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps2")},
		IsMatch:    true,
	},
	{
		Expression: "node=~vps",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    true,
	},
	{
		Expression: "node!~vps",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    false,
	},
	{
		Expression: "node!~abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    true,
	},
	{
		Expression: "node!~",
		IsValid:    false,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    false,
	},
	{
		Expression: "node=",
		IsValid:    false,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    false,
	},
	{
		Expression: "node===",
		IsValid:    false,
		Alert:      models.Alert{Labels: labels.FromStrings("node", "vps1")},
		IsMatch:    false,
	},

	{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("key", "abc")},
		IsMatch:    true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("key", "XXXabcx")},
		IsMatch:    true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert:      models.Alert{Labels: labels.FromStrings("abc", "xxxab")},
		IsMatch:    false,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "key", Value: "abc"},
			},
		},
		IsMatch: true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "key", Value: "ccc abc"},
			},
		},
		IsMatch: true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			Annotations: models.Annotations{
				models.Annotation{Name: "abc", Value: "zzz"},
			},
		},
		IsMatch: false,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", Comment: "abc"},
		IsMatch: true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", Comment: "abcxxx"},
		IsMatch: true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", Comment: "ABCD"},
		IsMatch: true,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1"},
		},
		Silence: models.Silence{ID: "1", Comment: "xzc"},
		IsMatch: false,
	},
	{
		Expression: "abc",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "^abb[****].*****",
		IsValid:    false,
	},
	{
		Expression: "@silenced=true",
		IsValid:    false,
	},
	{
		Expression: "@silenced!=false",
		IsValid:    false,
	},
	{
		Expression: "@silenced=~false",
		IsValid:    false,
	},
	{
		Expression: "@alertmanager!!",
		IsValid:    false,
	},
	{
		Expression: "@alertmanager=test",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@alertmanager=abc",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@alertmanager=~tes",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@alertmanager=~000",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@alertmanager!=tes",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@alertmanager!~abc",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@receiver=by-name",
		IsValid:    true,
		Alert: models.Alert{
			Receiver: "by-name",
		},
		IsMatch: true,
	},
	{
		Expression: "@cluster=foo",
		IsValid:    true,
		Alert: models.Alert{
			State: models.AlertStateActive,
		},
		IsMatch: false,
	},
	{
		Expression: "@cluster=HA",
		IsValid:    true,
		Alert: models.Alert{
			Receiver: "by-name",
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@cluster!=foo",
		IsValid:    true,
		Alert: models.Alert{
			Receiver: "by-name",
		},
		IsMatch:             true,
		IsAlertmanagerMatch: true,
	},
	{
		Expression: "@cluster=",
		IsValid:    false,
	},
	{
		Expression: "@receiver=by-name",
		IsValid:    true,
		Alert: models.Alert{
			Receiver: "by-not-name",
		},
		IsMatch: false,
	},
	{
		Expression: "@receiver=~name",
		IsValid:    true,
		Alert: models.Alert{
			Receiver: "by-not-name",
		},
		IsMatch: true,
	},

	// invalid regex pattern triggers buildMatcher failure in regex-capable filters
	{
		Expression: "@alertmanager=~[",
		IsValid:    false,
	},
	{
		Expression: "@cluster=~[",
		IsValid:    false,
	},
	{
		Expression: "@receiver=~[",
		IsValid:    false,
	},
	{
		Expression: "@silence_ticket=~[",
		IsValid:    false,
	},
	{
		Expression: "@silence_author=~[",
		IsValid:    false,
	},
	{
		Expression: "node=~[",
		IsValid:    false,
	},
}

func TestFilters(t *testing.T) {
	am, err := alertmanager.NewAlertmanager("HA", "test", "http://localhost", alertmanager.WithRequestTimeout(time.Second))
	if err != nil {
		t.Error(err)
	}
	for _, ft := range tests {
		t.Run(ft.Expression, func(t *testing.T) {
			alert := ft.Alert
			if len(ft.Alertmanagers) > 0 {
				alert.Alertmanager = ft.Alertmanagers
			} else {
				alert.Alertmanager = []models.AlertmanagerInstance{
					{
						Cluster:     "HA",
						Name:        am.Name,
						Silences:    map[string]*models.Silence{},
						SilencedBy:  ft.Alert.SilencedBy,
						InhibitedBy: ft.Alert.InhibitedBy,
						State:       ft.Alert.State,
					},
				}
			}
			if ft.Silence.ID != "" {
				alert.Alertmanager[0].Silences[ft.Silence.ID] = &ft.Silence
				alert.Alertmanager[0].SilencedBy = append(alert.Alertmanager[0].SilencedBy, ft.Silence.ID)
			}

			f := filters.NewFilter(ft.Expression)
			if f == nil {
				t.Errorf("[%s] No filter found", ft.Expression)
			}
			if f.Hits() != 0 {
				t.Errorf("[%s] Hits = %#v after init(), expected 0", ft.Expression, f.Hits())
			}
			if f.Valid() != ft.IsValid {
				t.Errorf("[%s] Valid() returned %#v while %#v was expected", ft.Expression, f.Valid(), ft.IsValid)
			}
			if f.Valid() {
				isAlertmanagerFilter := slices.Contains(
					[]string{"@age", "@alertmanager", "@cluster", "@inhibited", "@inhibited_by", "@state", "@silenced_by", "@silence_ticket", "@silence_author", "@fingerprint"},
					f.Name())
				if isAlertmanagerFilter != f.IsAlertmanagerFilter() {
					t.Errorf("[%s] IsAlertmanagerFilter() returned %#v while %#v was expected", ft.Expression, f.IsAlertmanagerFilter(), isAlertmanagerFilter)
				}

				m := f.Match(&alert, 0)
				if m != ft.IsMatch {
					j, _ := json.Marshal(alert)
					s, _ := json.Marshal(ft.Silence)
					t.Errorf("[%s] Match() returned %#v while %#v was expected\nalert used: %s\nsilence used: %s", ft.Expression, m, ft.IsMatch, j, s)
				}
				if ft.IsMatch && f.Hits() != 1 {
					t.Errorf("[%s] Hits() returned %#v after match, expected 1", ft.Expression, f.Hits())
				}
				if !ft.IsMatch && f.Hits() != 0 {
					t.Errorf("[%s] Hits() returned %#v after non-match, expected 0", ft.Expression, f.Hits())
				}
				if f.RawText() != strings.Trim(ft.Expression, " \t") {
					t.Errorf("[%s] RawText() returned %#v != %s passed as the expression", ft.Expression, f.RawText(), ft.Expression)
				}

				if m && f.IsAlertmanagerFilter() {
					for _, am := range alert.Alertmanager {
						m := f.MatchAlertmanager(&am)
						if m != ft.IsAlertmanagerMatch {
							j, _ := json.Marshal(alert)
							s, _ := json.Marshal(ft.Silence)
							t.Errorf("[%s] MatchAlertmanager() returned %#v while %#v was expected\nalert used: %s\nsilence used: %s", ft.Expression, m, ft.IsAlertmanagerMatch, j, s)

						}
					}
				}
			}
			if !f.Valid() {
				m := f.Match(&alert, 0)
				if m {
					t.Errorf("[%s] Match() on invalid filter returned true, expected false", ft.Expression)
				}
			}
		})
	}
}

type limitFilterTest struct {
	Expression string
	Value      string
	IsMatch    []bool
	Hits       int
	IsValid    bool
}

var limitTests = []limitFilterTest{
	{
		Expression: "@limit=3",
		Value:      "3",
		IsValid:    true,
		IsMatch:    []bool{true, true, true},
		Hits:       0,
	},
	{
		Expression: "@limit=1",
		Value:      "1",
		IsValid:    true,
		IsMatch:    []bool{true, false, false},
		Hits:       2,
	},
	{
		Expression: "@limit=5",
		Value:      "5",
		IsValid:    true,
		IsMatch:    []bool{true, true, true, true, true, false, false, false},
		Hits:       3,
	},
	{
		Expression: "@limit=0",
		IsValid:    false,
	},
	{
		Expression: "@limit=abc",
		IsValid:    false,
	},
	{
		Expression: "@limit==0",
		IsValid:    false,
	},
	{
		Expression: "@limit>0",
		IsValid:    false,
	},
	{
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
		if f.Hits() != 0 {
			t.Errorf("[%s] Hits = %#v after init(), expected 0", ft.Expression, f.Hits())
		}
		if f.Valid() != ft.IsValid {
			t.Errorf("[%s] Valid() returned %#v while %#v was expected", ft.Expression, f.Valid(), ft.IsValid)
		}
		if f.Valid() {
			alert := models.Alert{}
			var index int
			for _, isMatch := range ft.IsMatch {
				m := f.Match(&alert, index)
				if m != isMatch {
					t.Errorf("[%s] Match() returned %#v while %#v was expected, index %d", ft.Expression, m, isMatch, index)
				}
				if f.RawText() != ft.Expression {
					t.Errorf("[%s] RawText() returned %#v != %s passed as the expression", ft.Expression, f.RawText(), ft.Expression)
				}
				index++
			}
			if f.Hits() != ft.Hits {
				t.Errorf("[%s] Hits() returned %#v hits, expected %d", ft.Expression, f.Hits(), ft.Hits)
			}
		} else {
			alert := models.Alert{}
			m := f.Match(&alert, 0)
			if m {
				t.Errorf("[%s] Match() on invalid filter returned true, expected false", ft.Expression)
			}
		}
	}
}

func TestMatchAlertmanagerNoMatch(t *testing.T) {
	// verifies that MatchAlertmanager returns false when the alertmanager
	// instance does not satisfy the filter condition
	type testCase struct {
		expression string
		am         models.AlertmanagerInstance
	}
	tests := []testCase{
		// inhibited_by filter — AM has no matching inhibitedBy entry
		{
			expression: "@inhibited_by=abcdef",
			am:         models.AlertmanagerInstance{InhibitedBy: []string{"other"}},
		},
		// inhibited_by filter — AM has empty inhibitedBy list
		{
			expression: "@inhibited_by=abcdef",
			am:         models.AlertmanagerInstance{},
		},
		// silenced_by filter — AM has no matching silencedBy entry
		{
			expression: "@silenced_by=abcdef",
			am:         models.AlertmanagerInstance{SilencedBy: []string{"other"}},
		},
		// silenced_by filter — AM has empty silencedBy list
		{
			expression: "@silenced_by=abcdef",
			am:         models.AlertmanagerInstance{},
		},
		// silence_author filter — AM has silencedBy but silence not found in map
		{
			expression: "@silence_author=john",
			am: models.AlertmanagerInstance{
				SilencedBy: []string{"missing-id"},
				Silences:   map[string]*models.Silence{},
			},
		},
		// silence_author filter — AM has no silencedBy entries
		{
			expression: "@silence_author=john",
			am: models.AlertmanagerInstance{
				Silences: map[string]*models.Silence{},
			},
		},
		// silence_ticket filter — AM has silencedBy but silence not found in map
		{
			expression: "@silence_ticket=1",
			am: models.AlertmanagerInstance{
				SilencedBy: []string{"missing-id"},
				Silences:   map[string]*models.Silence{},
			},
		},
		// silence_ticket filter — AM has no silencedBy entries
		{
			expression: "@silence_ticket=1",
			am: models.AlertmanagerInstance{
				Silences: map[string]*models.Silence{},
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.expression, func(t *testing.T) {
			f := filters.NewFilter(tc.expression)
			if !f.Valid() {
				t.Fatalf("filter %q is not valid", tc.expression)
			}
			if f.MatchAlertmanager(&tc.am) {
				t.Errorf("MatchAlertmanager() returned true, expected false for %q", tc.expression)
			}
		})
	}
}
