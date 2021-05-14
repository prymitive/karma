package models

import "time"

type SilenceMatcher struct {
	Name    string `json:"name"`
	Value   string `json:"value"`
	IsRegex bool   `json:"isRegex"`
	IsEqual bool   `json:"isEqual"`
}

// Silence is vanilla silence + some additional attributes
// karma adds JIRA support, it can extract JIRA IDs from comments
// extracted ID is used to generate link to JIRA issue
// this means karma needs to store additional fields for each silence
type Silence struct {
	ID        string           `json:"id"`
	Matchers  []SilenceMatcher `json:"matchers"`
	StartsAt  time.Time        `json:"startsAt"`
	EndsAt    time.Time        `json:"endsAt"`
	CreatedAt time.Time        `json:"createdAt"`
	CreatedBy string           `json:"createdBy"`
	Comment   string           `json:"comment"`
	// karma fields
	TicketID  string `json:"ticketID"`
	TicketURL string `json:"ticketURL"`
}

// ManagedSilence is a standalone silence detached from any alert
type ManagedSilence struct {
	Cluster    string  `json:"cluster"`
	IsExpired  bool    `json:"isExpired"`
	AlertCount int     `json:"alertCount"`
	Silence    Silence `json:"silence"`
}
