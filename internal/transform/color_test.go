package transform_test

import (
	"testing"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
)

type colorTest struct {
	uniqueLabels []string
	customLabels map[string]map[string]string
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
		customLabels: map[string]map[string]string{
			"node": map[string]string{"localhost": "#fff"},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{
			"node": "localhost",
		},
	},
	{
		customLabels: map[string]map[string]string{
			"node": map[string]string{"localhost": "not a color"},
		},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{},
	},
	{
		customLabels: map[string]map[string]string{
			"node": map[string]string{"*": "#123"},
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
