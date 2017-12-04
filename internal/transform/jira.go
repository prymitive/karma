package transform

import (
	"fmt"
	"log"
	"regexp"

	"github.com/cloudflare/unsee/internal/models"
)

type jiraDetectRule struct {
	Regexp *regexp.Regexp
	URL    string
}

var jiraDetectRules = []jiraDetectRule{}

// ParseRules will parse and validate list of JIRA detection rules provided
// from config, valid rules will be stored for future use in DetectJIRAs() calls
func ParseRules(rules []models.JiraRule) {
	for _, rule := range rules {
		if rule.Regex == "" || rule.URI == "" {
			log.Fatalf("Invalid JIRA rule with regexp '%s' and url '%s'", rule.Regex, rule.URI)
		}
		jdr := jiraDetectRule{
			Regexp: regexp.MustCompile(rule.Regex),
			URL:    rule.URI,
		}
		jiraDetectRules = append(jiraDetectRules, jdr)
	}
}

// DetectJIRAs will try to find JIRA links in Alertmanager silence objects
// using regexp rules from configuration that were parsed and populated
// by ParseRules call
func DetectJIRAs(silence *models.Silence) (jiraID, jiraLink string) {
	for _, jdr := range jiraDetectRules {
		jiraID := jdr.Regexp.FindString(silence.Comment)
		if jiraID != "" {
			jiraLink := fmt.Sprintf("%s/browse/%s", jdr.URL, jiraID)
			return jiraID, jiraLink
		}
	}
	return "", ""
}
