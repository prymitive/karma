package models

import "time"

// Silence is vanilla silence + some additional attributes
// Unsee adds JIRA support, it can extract JIRA IDs from comments
// extracted ID is used to generate link to JIRA issue
// this means Unsee needs to store additional fields for each silence
type Silence struct {
	ID       string `json:"id"`
	Matchers []struct {
		Name    string `json:"name"`
		Value   string `json:"value"`
		IsRegex bool   `json:"isRegex"`
	} `json:"matchers"`
	StartsAt  time.Time `json:"startsAt"`
	EndsAt    time.Time `json:"endsAt"`
	CreatedAt time.Time `json:"createdAt"`
	CreatedBy string    `json:"createdBy"`
	Comment   string    `json:"comment"`
	// unsee fields
	JiraID  string `json:"jiraID"`
	JiraURL string `json:"jiraURL"`
}
