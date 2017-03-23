package transform

import (
	"strings"
)

// StripLables allows filtering out some labels from alerts
// it takes the list of label keys to ignore and alert label map
// it will return label map without labels found on the ignore list
func StripLables(ignoredLabels []string, sourceLabels map[string]string) map[string]string {
	labels := map[string]string{}
	for label, value := range sourceLabels {
		if !stringInSlice(ignoredLabels, label) {
			// strip leading and trailung space in label value
			// this is to normalize values in case space is added by AlertManager rules
			labels[label] = strings.TrimSpace(value)
		}
	}
	return labels
}
