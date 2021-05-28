package models

import "regexp"

// LinkDetectRule is used to detect JIRA issue IDs in strings and turn those into
// links
type LinkDetectRule struct {
	Regex       *regexp.Regexp
	URITemplate string
}
