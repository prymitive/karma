package transform

import (
	"github.com/prymitive/karma/internal/models"
)

var linkDetectRules []models.LinkDetectRule

func SetLinkRules(rules []models.LinkDetectRule) {
	linkDetectRules = rules
}

// DetectLinks will try to find all links in Alertmanager silence objects
// using regexp rules from configuration
func DetectLinks(silence *models.Silence) (text, uri string) {
	for _, rule := range linkDetectRules {
		m := rule.Regex.FindString(silence.Comment)
		if m != "" {
			result := []byte{}
			for _, submatches := range rule.Regex.FindAllStringSubmatchIndex(silence.Comment, -1) {
				result = rule.Regex.ExpandString(result, rule.URITemplate, silence.Comment, submatches)
			}
			return m, string(result)
		}
	}
	return "", ""
}
