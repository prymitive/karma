package models

import (
	"fmt"
	"sort"

	"github.com/fvbommel/sortorder"

	"github.com/prymitive/karma/internal/slices"
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

// Color is used by karmaLabelColor to reprenset colors as RGBA
type Color struct {
	Red   uint8 `json:"red"`
	Green uint8 `json:"green"`
	Blue  uint8 `json:"blue"`
	Alpha uint8 `json:"alpha"`
}

func (c *Color) ToString() string {
	return fmt.Sprintf("rgba(%d,%d,%d,%d)", c.Red, c.Green, c.Blue, c.Alpha)
}

// LabelColors holds color information for labels that should be colored in the UI
// every configured label will have a distinct coloring for each value
type LabelColors struct {
	Brightness int32  `json:"brightness"`
	Background string `json:"background"`
}

// LabelsColorMap is a map of "Label Key" -> "Label Value" -> karmaLabelColors
type LabelsColorMap map[string]map[string]LabelColors

// LabelsCountMap is a map of "Label Key" -> "Label Value" -> number of occurrence
type LabelsCountMap map[string]map[string]int

type LabelValueStats struct {
	Value   string `json:"value"`
	Raw     string `json:"raw"`
	Hits    int    `json:"hits"`
	Percent int    `json:"percent"`
	Offset  int    `json:"offset"`
}

type LabelValueStatsList []LabelValueStats

func (lvsl LabelValueStatsList) Len() int {
	return len(lvsl)
}
func (lvsl LabelValueStatsList) Swap(i, j int) {
	lvsl[i], lvsl[j] = lvsl[j], lvsl[i]
}
func (lvsl LabelValueStatsList) Less(i, j int) bool {
	if lvsl[i].Hits == lvsl[j].Hits {
		return sortorder.NaturalLess(lvsl[i].Value, lvsl[j].Value)
	}
	return lvsl[i].Hits > lvsl[j].Hits
}

// LabelStats is used in the overview modal, it shows top labels across alerts
type LabelNameStats struct {
	Name   string              `json:"name"`
	Values LabelValueStatsList `json:"values"`
	Hits   int                 `json:"hits"`
}

type LabelNameStatsList []LabelNameStats

func (lnsl LabelNameStatsList) Len() int {
	return len(lnsl)
}
func (lnsl LabelNameStatsList) Swap(i, j int) {
	lnsl[i], lnsl[j] = lnsl[j], lnsl[i]
}
func (lnsl LabelNameStatsList) Less(i, j int) bool {
	if lnsl[i].Hits == lnsl[j].Hits {
		return lnsl[i].Name < lnsl[j].Name
	}
	return lnsl[i].Hits > lnsl[j].Hits
}

// APIAlertGroupSharedMaps defines shared part of APIAlertGroup
type APIAlertGroupSharedMaps struct {
	Annotations Annotations         `json:"annotations"`
	Labels      map[string]string   `json:"labels"`
	Silences    map[string][]string `json:"silences"`
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

	labelCounts := make(map[string]int, len(ag.Alerts))

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

func (ag *APIAlertGroup) dedupSilences() {
	ag.Shared.Silences = map[string][]string{}

	silencesByCluster := map[string]map[string]int{}

	for _, alert := range ag.Alerts {
		// process each cluster only once, rather than each alertmanager instance
		clusters := []string{}
		for _, am := range alert.Alertmanager {
			if slices.StringInSlice(clusters, am.Cluster) {
				continue
			}
			clusters = append(clusters, am.Cluster)
			for _, silenceID := range am.SilencedBy {
				_, ok := silencesByCluster[am.Cluster]
				if !ok {
					silencesByCluster[am.Cluster] = map[string]int{}
				}
				_, ok = silencesByCluster[am.Cluster][silenceID]
				if !ok {
					silencesByCluster[am.Cluster][silenceID] = 0
				}
				silencesByCluster[am.Cluster][silenceID]++
			}
		}
	}

	totalAlerts := len(ag.Alerts)
	for cluster, silenceCountMap := range silencesByCluster {
		for silenceID, affectedAlertsCount := range silenceCountMap {
			if affectedAlertsCount == totalAlerts {
				_, ok := ag.Shared.Silences[cluster]
				if !ok {
					ag.Shared.Silences[cluster] = []string{}
				}
				ag.Shared.Silences[cluster] = append(ag.Shared.Silences[cluster], silenceID)
				// sort to have stable order of silences
				sort.Strings(ag.Shared.Silences[cluster])
			}
		}
	}
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
		ag.dedupSilences()
	} else {
		ag.Shared = APIAlertGroupSharedMaps{
			Labels:      map[string]string{},
			Annotations: Annotations{},
			Silences:    map[string][]string{},
		}
	}
}

// GridSettings exposes all grid settings from the config file
type GridSettings struct {
	Order   string `json:"order"`
	Reverse bool   `json:"reverse"`
	Label   string `json:"label"`
}

// SortSettings nests all settings specific to sorting
type SortSettings struct {
	Grid         GridSettings                 `json:"grid"`
	ValueMapping map[string]map[string]string `json:"valueMapping"`
}

type SilenceFormStripSettings struct {
	Labels []string `json:"labels"`
}

type SilenceFormSettings struct {
	Strip SilenceFormStripSettings `json:"strip"`
}

type AlertAcknowledgementSettings struct {
	Enabled         bool   `json:"enabled"`
	DurationSeconds int    `json:"durationSeconds"`
	Author          string `json:"author"`
	Comment         string `json:"comment"`
}

// Settings is used to export karma configuration that is used by UI
type Settings struct {
	StaticColorLabels        []string                     `json:"staticColorLabels"`
	AnnotationsDefaultHidden bool                         `json:"annotationsDefaultHidden"`
	AnnotationsHidden        []string                     `json:"annotationsHidden"`
	AnnotationsVisible       []string                     `json:"annotationsVisible"`
	AnnotationsAllowHTML     bool                         `json:"annotationsEnableHTML"`
	Sorting                  SortSettings                 `json:"sorting"`
	SilenceForm              SilenceFormSettings          `json:"silenceForm"`
	AlertAcknowledgement     AlertAcknowledgementSettings `json:"alertAcknowledgement"`
	HistoryEnabled           bool                         `json:"historyEnabled"`
}

type AuthenticationInfo struct {
	Enabled  bool   `json:"enabled"`
	Username string `json:"username"`
}

type APIGrid struct {
	LabelName   string          `json:"labelName"`
	LabelValue  string          `json:"labelValue"`
	AlertGroups []APIAlertGroup `json:"alertGroups"`
	StateCount  map[string]int  `json:"stateCount"`
}

// AlertsResponse is the structure of JSON response UI will use to get alert data
type AlertsResponse struct {
	Status         string                        `json:"status"`
	Timestamp      string                        `json:"timestamp"`
	Version        string                        `json:"version"`
	Upstreams      AlertmanagerAPISummary        `json:"upstreams"`
	Silences       map[string]map[string]Silence `json:"silences"`
	Grids          []APIGrid                     `json:"grids"`
	TotalAlerts    int                           `json:"totalAlerts"`
	Colors         LabelsColorMap                `json:"colors"`
	Filters        []Filter                      `json:"filters"`
	Counters       LabelNameStatsList            `json:"counters"`
	Settings       Settings                      `json:"settings"`
	Authentication AuthenticationInfo            `json:"authentication"`
	Receivers      []string                      `json:"receivers"`
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal representation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}
