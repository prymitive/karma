package models

import (
	"time"

	"github.com/prymitive/karma/internal/regex"
)

type SilenceMatcher struct {
	Name    string `json:"name"`
	Value   string `json:"value"`
	IsRegex bool   `json:"isRegex"`
	IsEqual bool   `json:"isEqual"`
}

func (sm SilenceMatcher) IsMatch(labels map[string]string) bool {
	v, ok := labels[sm.Name]
	if !ok {
		return !sm.IsEqual
	}

	if sm.IsRegex {
		return sm.IsEqual == regex.MustCompileAnchored(sm.Value).MatchString(v)
	}
	return sm.IsEqual == (sm.Value == v)
}

// Silence is vanilla silence + some additional attributes
// karma adds JIRA support, it can extract JIRA IDs from comments
// extracted ID is used to generate link to JIRA issue
// this means karma needs to store additional fields for each silence
type Silence struct {
	StartsAt  time.Time        `json:"startsAt"`
	EndsAt    time.Time        `json:"endsAt"`
	CreatedAt time.Time        `json:"createdAt"`
	ID        string           `json:"id"`
	TicketID  string           `json:"ticketID"`
	CreatedBy string           `json:"createdBy"`
	Comment   string           `json:"comment"`
	TicketURL string           `json:"ticketURL"`
	Matchers  []SilenceMatcher `json:"matchers"`
}

func (s Silence) IsMatch(labels map[string]string) bool {
	for _, m := range s.Matchers {
		if !m.IsMatch(labels) {
			return false
		}
	}
	return true
}

// ManagedSilence is a standalone silence detached from any alert
type ManagedSilence struct {
	Cluster    string  `json:"cluster"`
	Silence    Silence `json:"silence"`
	AlertCount int     `json:"alertCount"`
	IsExpired  bool    `json:"isExpired"`
}
