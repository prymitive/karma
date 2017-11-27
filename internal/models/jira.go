package models

// JiraRule is used to detect JIRA issue IDs in strings and turn those into
// links
type JiraRule struct {
	Regex string
	URI   string
}
