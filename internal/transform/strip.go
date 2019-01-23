package transform

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
)

// StripLables allows filtering out some labels from alerts
// it takes the list of label keys to ignore and alert label map
// it will return label map without labels found on the ignore list
func StripLables(keptLabels, ignoredLabels []string, sourceLabels map[string]string) map[string]string {
	// empty keep list means keep everything by default
	keepAll := len(keptLabels) == 0
	labels := map[string]string{}
	for label, value := range sourceLabels {
		// is explicitly marked to be kept
		inKeep := slices.StringInSlice(keptLabels, label)
		// is explicitly marked to be stripped
		inStrip := slices.StringInSlice(ignoredLabels, label)
		if (keepAll || inKeep) && !inStrip {
			// strip leading and trailung space in label value
			// this is to normalize values in case space is added by Alertmanager rules
			labels[label] = strings.TrimSpace(value)
		}
	}
	return labels
}

// StripReceivers allows filtering all alerts for specified receiver(s)
// it will return true if alert uses receiver that should be stripped
func StripReceivers(keptReceivers, ignoredReceivers []string, alertReceiver string) bool {
	// true if we keep by default
	keepAll := len(keptReceivers) == 0
	// is this receiver on the whitelist ?
	inKeep := slices.StringInSlice(keptReceivers, alertReceiver)
	// is this receiver on the blacklist ?
	inStrip := slices.StringInSlice(ignoredReceivers, alertReceiver)
	if (keepAll || inKeep) && !inStrip {
		return false
	}
	return true
}

// StripAnnotations allows to ignore some annotations when pulling data
// Alertmanager, it will return true if passed annotation name should be
// stripped
func StripAnnotations(keptAnnotations, ignoredAnnotations []string, sourceAnnotations models.Annotations) models.Annotations {
	// empty keep list means keep everything by default
	keepAll := len(keptAnnotations) == 0
	annotations := models.Annotations{}
	for _, annotation := range sourceAnnotations {
		// is explicitly marked to be kept
		inKeep := slices.StringInSlice(keptAnnotations, annotation.Name)
		// is explicitly marked to be stripped
		inStrip := slices.StringInSlice(ignoredAnnotations, annotation.Name)
		if (keepAll || inKeep) && !inStrip {
			annotations = append(annotations, annotation)
		}
	}
	return annotations
}
