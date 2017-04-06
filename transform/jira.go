package transform

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/cloudflare/unsee/models"
)

type jiraDetectRule struct {
	Regexp *regexp.Regexp
	URL    string
}

var jiraDetectRules = []jiraDetectRule{}

// ParseRules will parse and validate list of JIRA detection rules provided
// from config, valid rules will be stored for future use in DetectJIRAs() calls
func ParseRules(rules []string) {
	for _, s := range rules {
		ss := strings.SplitN(s, "@", 2)
		re := ss[0]
		url := ss[1]
		if re == "" || url == "" {
			log.Fatalf("Invalid JIRA rule '%s', regexp part is '%s', url is '%s'", s, re, url)
		}
		jdr := jiraDetectRule{
			Regexp: regexp.MustCompile(re),
			URL:    url,
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
