package transform_test

import (
	"testing"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/transform"
)

type colorTest struct {
	config []string
	labels map[string]string
	colors map[string]string
}

var colorTests = []colorTest{
	colorTest{
		labels: map[string]string{},
	},
	colorTest{
		labels: map[string]string{
			"node": "localhost",
		},
	},
	colorTest{
		config: []string{"node"},
		labels: map[string]string{
			"node": "localhost",
		},
		colors: map[string]string{
			"node": "localhost",
		},
	},
	colorTest{
		config: []string{"node", "instance"},
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
	colorTest{
		config: []string{"job", "node", "instance"},
		labels: map[string]string{
			"job": "node_ping",
		},
		colors: map[string]string{
			"job": "node_ping",
		},
	},
}

func TestColorLabel(t *testing.T) {
	for _, testCase := range colorTests {
		config.Config.ColorLabelsUnique = testCase.config
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
				for value, _ := range valueMap {
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
