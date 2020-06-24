package transform_test

import (
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
)

type linkTest struct {
	silence models.Silence
	text    string
	uri     string
}

var linkRules = []config.LinkDetectRules{
	{
		Regex:       "(DEVOPS-[0-9]+)",
		URITemplate: "https://jira.example.com/browse/$1",
	},
	{
		Regex:       "(PROJECT-[0-9]+)",
		URITemplate: "https://example.com/browse/$1",
	},
	{
		Regex:       "(redmine[0-9]+)",
		URITemplate: "https://redmine.example.com/issue/$1.php",
	},
}

var linkTests = []linkTest{
	{
		silence: models.Silence{
			Comment: "Lorem ipsum dolor sit amet",
		},
	},
	{
		silence: models.Silence{
			Comment: "DVOPS-123",
		},
	},
	{
		silence: models.Silence{
			Comment: "DEVOPS team",
		},
	},
	{
		silence: models.Silence{
			Comment: "a project-1 b",
		},
	},
	{
		silence: models.Silence{
			Comment: "a PROJECT- b",
		},
	},
	{
		silence: models.Silence{
			Comment: "DEVOPS-1",
		},
		text: "DEVOPS-1",
		uri:  "https://jira.example.com/browse/DEVOPS-1",
	},
	{
		silence: models.Silence{
			Comment: "DEVOPS-123",
		},
		text: "DEVOPS-123",
		uri:  "https://jira.example.com/browse/DEVOPS-123",
	},
	{
		silence: models.Silence{
			Comment: "a DEVOPS-1 b",
		},
		text: "DEVOPS-1",
		uri:  "https://jira.example.com/browse/DEVOPS-1",
	},
	{
		silence: models.Silence{
			Comment: "PROJECT-9",
		},
		text: "PROJECT-9",
		uri:  "https://example.com/browse/PROJECT-9",
	},
	{
		silence: models.Silence{
			Comment: "redmine0",
		},
		text: "redmine0",
		uri:  "https://redmine.example.com/issue/redmine0.php",
	},
}

func TestDetectTickets(t *testing.T) {
	linkDetectRules := []models.LinkDetectRule{}
	for _, rule := range linkRules {
		re, err := regexp.Compile(rule.Regex)
		if err != nil {
			t.Errorf("Invalid link detect rule '%s': %s", rule.Regex, err)
		}
		linkDetectRules = append(linkDetectRules, models.LinkDetectRule{Regex: re, URITemplate: rule.URITemplate})
	}
	transform.SetLinkRules(linkDetectRules)

	for _, testCase := range linkTests {
		testCase := testCase
		text, uri := transform.DetectLinks(&testCase.silence)
		if text != testCase.text {
			t.Errorf("Invalid ticket ID detected in silence comment '%s', expected '%s', got '%s'",
				testCase.silence.Comment, testCase.text, text)
		}
		if text != testCase.text {
			t.Errorf("Invalid ticket link detected in silence comment '%s', expected '%s', got '%s'",
				testCase.silence.Comment, testCase.uri, uri)
		}
	}
}
