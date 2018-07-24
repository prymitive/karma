package models

import (
	"fmt"

	"github.com/prymitive/unsee/internal/slices"
)

// Filter holds returned data on any filter passed by the user as part of the query
type Filter struct {
	Text    string `json:"text"`
	Name    string `json:"name"`
	Matcher string `json:"matcher"`
	Value   string `json:"value"`
	Hits    int    `json:"hits"`
	IsValid bool   `json:"isValid"`
}

// Color is used by UnseeLabelColor to reprenset colors as RGBA
type Color struct {
	Red   uint8 `json:"red"`
	Green uint8 `json:"green"`
	Blue  uint8 `json:"blue"`
	Alpha uint8 `json:"alpha"`
}

// LabelColors holds color information for labels that should be colored in the UI
// every configured label will have a distinct coloring for each value
type LabelColors struct {
	Font       Color `json:"font"`
	Background Color `json:"background"`
}

// LabelsColorMap is a map of "Label Key" -> "Label Value" -> UnseeLabelColors
type LabelsColorMap map[string]map[string]LabelColors

// LabelsCountMap is a map of "Label Key" -> "Label Value" -> number of occurence
type LabelsCountMap map[string]map[string]int

// APIAlertGroupSharedMaps defines shared part of APIAlertGroup
type APIAlertGroupSharedMaps struct {
	Annotations Annotations       `json:"annotations"`
	Labels      map[string]string `json:"labels"`
}

// APIAlertGroup is how AlertGroup is returned in the API response
// All labels and annotations that are shared between all alerts in given group
// are moved to Shared namespace, each alert instance only tracks labels and
// annotations that are unique to that instance
type APIAlertGroup struct {
	AlertGroup
	Shared APIAlertGroupSharedMaps `json:"shared"`
}

func (ag *APIAlertGroup) dedupLabels() {
	totalAlerts := len(ag.Alerts)

	labelCounts := map[string]int{}

	for _, alert := range ag.Alerts {
		for name, val := range alert.Labels {
			key := fmt.Sprintf("%s\n%s", name, val)
			_, found := labelCounts[key]
			if found {
				labelCounts[key]++
			} else {
				labelCounts[key] = 1
			}
		}
	}

	sharedLabels := map[string]string{}

	for i, alert := range ag.Alerts {
		newAlertLabels := map[string]string{}
		for name, val := range alert.Labels {
			key := fmt.Sprintf("%s\n%s", name, val)
			if labelCounts[key] == totalAlerts {
				sharedLabels[name] = val
			} else {
				newAlertLabels[name] = val
			}
		}
		ag.Alerts[i].Labels = newAlertLabels
	}

	ag.Shared.Labels = sharedLabels

}

func (ag *APIAlertGroup) removeGroupingLabels() {
	for i, alert := range ag.Alerts {
		newAlertLabels := map[string]string{}
		for name, val := range alert.Labels {
			if _, found := ag.Labels[name]; found {
				// skip all labels that are used for grouping
				continue
			}
			newAlertLabels[name] = val
		}
		ag.Alerts[i].Labels = newAlertLabels
	}
}

func (ag *APIAlertGroup) dedupAnnotations() {
	totalAlerts := len(ag.Alerts)

	annotationCount := map[string]int{}

	for _, alert := range ag.Alerts {
		for _, annotation := range alert.Annotations {
			key := fmt.Sprintf("%s\n%s", annotation.Name, annotation.Value)
			_, found := annotationCount[key]
			if found {
				annotationCount[key]++
			} else {
				annotationCount[key] = 1
			}
		}
	}

	sharedAnnotations := Annotations{}
	sharedKeys := []string{}

	for i, alert := range ag.Alerts {
		newAlertAnnotations := Annotations{}
		for _, annotation := range alert.Annotations {
			key := fmt.Sprintf("%s\n%s", annotation.Name, annotation.Value)
			if annotationCount[key] == totalAlerts {
				if !slices.StringInSlice(sharedKeys, key) {
					sharedAnnotations = append(sharedAnnotations, annotation)
					sharedKeys = append(sharedKeys, key)
				}
			} else {
				newAlertAnnotations = append(newAlertAnnotations, annotation)
			}
		}
		ag.Alerts[i].Annotations = newAlertAnnotations
	}

	ag.Shared.Annotations = sharedAnnotations
}

// DedupSharedMaps will find all labels and annotations shared by all alerts
// in this group and moved them to Shared namespace
func (ag *APIAlertGroup) DedupSharedMaps() {
	// remove all labels that are used for grouping
	ag.removeGroupingLabels()
	// don't dedup if we only have a single alert in this group
	if len(ag.Alerts) > 1 {
		ag.dedupLabels()
		ag.dedupAnnotations()
	} else {
		ag.Shared = APIAlertGroupSharedMaps{
			Labels:      map[string]string{},
			Annotations: Annotations{},
		}
	}
}

// Settings is used to export unsee configuration that is used by UI
type Settings struct {
	StaticColorLabels        []string `json:"staticColorLabels"`
	AnnotationsDefaultHidden bool     `json:"annotationsDefaultHidden"`
	AnnotationsHidden        []string `json:"annotationsHidden"`
	AnnotationsVisible       []string `json:"annotationsVisible"`
}

// AlertsResponse is the structure of JSON response UI will use to get alert data
type AlertsResponse struct {
	Status      string                        `json:"status"`
	Timestamp   string                        `json:"timestamp"`
	Version     string                        `json:"version"`
	Upstreams   AlertmanagerAPISummary        `json:"upstreams"`
	Silences    map[string]map[string]Silence `json:"silences"`
	AlertGroups map[string]APIAlertGroup      `json:"groups"`
	TotalAlerts int                           `json:"totalAlerts"`
	Colors      LabelsColorMap                `json:"colors"`
	Filters     []Filter                      `json:"filters"`
	Counters    LabelsCountMap                `json:"counters"`
	Settings    Settings                      `json:"settings"`
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal represenation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}
