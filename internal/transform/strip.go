package transform

import (
	"regexp"
	"slices"
	"sort"
	"strings"

	"github.com/prymitive/karma/internal/models"
	sliceutils "github.com/prymitive/karma/internal/slices"
)

// StripLables allows filtering out some labels from alerts
// it takes the list of label keys to ignore and alert label map
// it will return label map without labels found on the ignore list
func StripLables(keptLabels, ignoredLabels []string, keptLabelsRegex, ignoredLabelsRegex []*regexp.Regexp,
	sourceLabels models.Labels,
) models.Labels {
	// empty keep lists means keep everything by default
	keepAll := len(keptLabels) == 0 && len(keptLabelsRegex) == 0
	// if we keep everything and there's nothing to strip then simply return source labels as-is
	if keepAll && len(ignoredLabels) == 0 && len(ignoredLabelsRegex) == 0 {
		return sourceLabels
	}
	labels := make(models.Labels, 0, len(sourceLabels))
	var inKeep, inStrip bool
	for _, label := range sourceLabels {
		// is explicitly marked to be kept
		inKeep = slices.Contains(keptLabels, label.Name.Value()) || sliceutils.MatchesAnyRegex(label.Name.Value(), keptLabelsRegex)
		// is explicitly marked to be stripped
		inStrip = slices.Contains(ignoredLabels, label.Name.Value()) || sliceutils.MatchesAnyRegex(label.Name.Value(), ignoredLabelsRegex)
		if (keepAll || inKeep) && !inStrip {
			l := models.Label{
				Name: label.Name,
				// strip leading and trailing space in label value
				// this is to normalize values in case space is added by Alertmanager rules
				Value: models.NewUniqueString(strings.TrimSpace(label.Value.Value())),
			}
			labels = labels.Add(l)
		}
	}
	sort.Sort(labels)
	return labels
}

// StripReceivers allows filtering all alerts for specified receiver(s)
// it will return true if alert uses receiver that should be stripped
func StripReceivers(keptReceivers, ignoredReceivers []string, keptReceiversRegex, ignoredReceiversRegex []*regexp.Regexp, alertReceiver string) bool {
	// empty keep lists means keep everything by default
	keepAll := len(keptReceivers) == 0 && len(keptReceiversRegex) == 0
	// is explicitly marked to be kept
	inKeep := slices.Contains(keptReceivers, alertReceiver) || sliceutils.MatchesAnyRegex(alertReceiver, keptReceiversRegex)
	// is explicitly marked to be stripped
	inStrip := slices.Contains(ignoredReceivers, alertReceiver) || sliceutils.MatchesAnyRegex(alertReceiver, ignoredReceiversRegex)

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
	annotations := make(models.Annotations, 0, len(sourceAnnotations))
	for _, annotation := range sourceAnnotations {
		// is explicitly marked to be kept
		inKeep := slices.Contains(keptAnnotations, annotation.Name.Value())
		// is explicitly marked to be stripped
		inStrip := slices.Contains(ignoredAnnotations, annotation.Name.Value())
		if (keepAll || inKeep) && !inStrip {
			annotations = append(annotations, annotation)
		}
	}
	return annotations
}
