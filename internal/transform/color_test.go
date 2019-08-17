package transform_test

import (
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
)

type colorTest struct {
	uniqueLabels []string
	customLabels config.CustomLabelColors
	labels       map[string]string
	colors       map[string]string
}

var colorTests = []colorTest{
	{
		labels: map[string]string{},
	},
	{
		labels: map[string]string{
			"node": "localhost",
		},
	},
	{
		uniqueLabels: []string{"node"},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{
			"node": "localhost",
		},
	},
	{
		uniqueLabels: []string{"node", "instance"},
		labels: map[string]string{
			"node":     "instance",
			"env":      "instance",
			"instance": "server1",
			"job":      "node_exporter",
		},
		colors: map[string]string{
			"node":     "instance",
			"instance": "server1",
		},
	},
	{
		uniqueLabels: []string{"job", "node", "instance"},
		labels: map[string]string{
			"job": "node_ping",
		},
		colors: map[string]string{
			"job": "node_ping",
		},
	},
	{
		customLabels: config.CustomLabelColors{
			"node": []config.CustomLabelColor{
				{Value: "localhost", Color: "#fff"},
			},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{
			"node": "localhost",
		},
	},
	{
		customLabels: config.CustomLabelColors{
			"node": []config.CustomLabelColor{
				{Value: "localhost", Color: "not a valid color"},
			},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{},
	},
	{
		customLabels: config.CustomLabelColors{
			"node": []config.CustomLabelColor{
				{ValueRegex: ".*", Color: "#123"},
			},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{"node": "localhost"},
	},
	{
		customLabels: config.CustomLabelColors{
			"node": []config.CustomLabelColor{
				{Value: "foo", ValueRegex: ".*", Color: "#123"},
			},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{"node": "localhost"},
	},
}

func TestColorLabel(t *testing.T) {
	for _, testCase := range colorTests {
		config.Config.Labels.Color.Unique = testCase.uniqueLabels
		config.Config.Labels.Color.Custom = testCase.customLabels
		colorStore := models.LabelsColorMap{}

		for key, rules := range testCase.customLabels {
			for i, rule := range rules {
				if rule.ValueRegex != "" {
					testCase.customLabels[key][i].CompiledRegex = regexp.MustCompile(rule.ValueRegex)
				}
			}
		}

		for key, value := range testCase.labels {
			transform.ColorLabel(colorStore, key, value)
		}

		for key, value := range testCase.colors {
			if label, found := colorStore[key]; found {
				if _, found := label[value]; !found {
					t.Errorf("Expected value '%s' for label '%s' not found in color map", value, key)
				}
			} else {
				t.Errorf("Expected label '%s' not found in color map", key)
			}
		}
		for key, valueMap := range colorStore {
			if _, found := testCase.colors[key]; found {
				for value := range valueMap {
					if value != testCase.colors[key] {
						t.Errorf("Unexpected value '%s' for label '%s' found in color map", value, key)
					}
				}
			} else {
				t.Errorf("Unexpected label '%s' found in color map", key)
			}
		}
	}
}
