package transform_test

import (
	"testing"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
)

type jiraTest struct {
	silence  models.Silence
	jiraID   string
	jiraLink string
}

var jiraRules = []models.JiraRule{
	{
		Regex: "DEVOPS-[0-9]+",
		URI:   "https://jira.example.com",
	},
	{
		Regex: "PROJECT-[0-9]+",
		URI:   "https://example.com",
	},
}

var jiraTests = []jiraTest{
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
		jiraID:   "DEVOPS-1",
		jiraLink: "https://jira.example.com/browse/DEVOPS-1",
	},
	{
		silence: models.Silence{
			Comment: "DEVOPS-123",
		},
		jiraID:   "DEVOPS-123",
		jiraLink: "https://jira.example.com/browse/DEVOPS-123",
	},
	{
		silence: models.Silence{
			Comment: "a DEVOPS-1 b",
		},
		jiraID:   "DEVOPS-1",
		jiraLink: "https://jira.example.com/browse/DEVOPS-1",
	},
	{
		silence: models.Silence{
			Comment: "PROJECT-9",
		},
		jiraID:   "PROJECT-9",
		jiraLink: "https://example.com/browse/PROJECT-9",
	},
}

func TestDetectJIRAs(t *testing.T) {
	transform.ParseRules(jiraRules)
	for _, testCase := range jiraTests {
		jiraID, jiraLink := transform.DetectJIRAs(&testCase.silence)
		if jiraID != testCase.jiraID {
			t.Errorf("Invalid JIRA ID detected in silence comment '%s', expected '%s', got '%s'",
				testCase.silence.Comment, testCase.jiraID, jiraID)
		}
		if jiraID != testCase.jiraID {
			t.Errorf("Invalid JIRA link detected in silence comment '%s', expected '%s', got '%s'",
				testCase.silence.Comment, testCase.jiraLink, jiraLink)
		}
	}
}
