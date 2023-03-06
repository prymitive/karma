package models

import (
	"fmt"
	"net/url"
	"sort"
	"strings"

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

// LabelNameStats is used in the overview modal, it shows top labels across alerts
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
	Labels      Labels              `json:"labels"`
	Silences    map[string][]string `json:"silences"`
	Sources     []string            `json:"sources"`
	Clusters    []string            `json:"clusters"`
}

// APIAlertGroup is how AlertGroup is returned in the API response
// All labels and annotations that are shared between all alerts in given group
// are moved to Shared namespace, each alert instance only tracks labels and
// annotations that are unique to that instance
type APIAlertGroup struct {
	AlertGroup
	TotalAlerts int                            `json:"totalAlerts"`
	Shared      APIAlertGroupSharedMaps        `json:"shared"`
	AllLabels   map[string]map[string][]string `json:"allLabels"`
}

func (ag *APIAlertGroup) dedupLabels() {
	totalAlerts := len(ag.Alerts)

	labelCounts := make(map[string]int, len(ag.Alerts))

	for _, alert := range ag.Alerts {
		for _, l := range alert.Labels {
			key := fmt.Sprintf("%s\n%s", l.Name, l.Value)
			_, found := labelCounts[key]
			if found {
				labelCounts[key]++
			} else {
				labelCounts[key] = 1
			}
		}
	}

	sharedLabels := Labels{}

	for i, alert := range ag.Alerts {
		newAlertLabels := Labels{}
		for _, l := range alert.Labels {
			key := fmt.Sprintf("%s\n%s", l.Name, l.Value)
			if labelCounts[key] == totalAlerts {
				sharedLabels = sharedLabels.Add(l)
			} else {
				newAlertLabels = newAlertLabels.Add(l)
			}
		}
		ag.Alerts[i].Labels = newAlertLabels
	}

	ag.Shared.Labels = sharedLabels
}

func (ag *APIAlertGroup) removeGroupingLabels(dropNames []string) {
	newGroupLabels := Labels{}
	for _, l := range ag.Labels {
		if slices.StringInSlice(dropNames, l.Name) {
			continue
		}
		newGroupLabels = newGroupLabels.Add(l)
	}
	ag.Labels = newGroupLabels

	for i, alert := range ag.Alerts {
		newAlertLabels := Labels{}
		for _, l := range alert.Labels {
			if slices.StringInSlice(dropNames, l.Name) {
				// skip all labels from the drop list
				continue
			}
			if v := ag.Labels.Get(l.Name); v != nil {
				// skip all labels that are used for grouping
				continue
			}
			newAlertLabels = newAlertLabels.Add(l)
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

func (ag *APIAlertGroup) dedupSources() {
	ag.Shared.Sources = []string{}

	urls := map[string]struct{}{}
	var err error
	var u *url.URL
	for _, alert := range ag.Alerts {
		for _, am := range alert.Alertmanager {
			u, err = url.Parse(am.Source)
			if err != nil {
				continue
			}
			if u.String() == "" {
				continue
			}

			index := strings.Index(am.Source, "/graph?")
			if index >= 0 {
				urls[am.Source[:index]+"/"] = struct{}{}
			} else {
				urls[am.Source] = struct{}{}
			}
		}
	}

	for u := range urls {
		ag.Shared.Sources = append(ag.Shared.Sources, u)
	}
	sort.Strings(ag.Shared.Sources)
}

func (ag *APIAlertGroup) dedupClusters() {
	totalAlerts := len(ag.Alerts)

	alertsPerCluster := map[string]int{}
	for _, alert := range ag.Alerts {
		clusters := map[string]struct{}{}
		for _, am := range alert.Alertmanager {
			clusters[am.Cluster] = struct{}{}
		}
		for cluster := range clusters {
			if _, found := alertsPerCluster[cluster]; !found {
				alertsPerCluster[cluster] = 0
			}
			alertsPerCluster[cluster]++
		}
	}

	ag.Shared.Clusters = []string{}
	for cluster, alerts := range alertsPerCluster {
		if alerts == totalAlerts {
			ag.Shared.Clusters = append(ag.Shared.Clusters, cluster)
		}
	}
	sort.Strings(ag.Shared.Clusters)
}

func (ag *APIAlertGroup) populateAllLabels() {
	ag.AllLabels = map[string]map[string][]string{
		AlertStateActive:      {},
		AlertStateSuppressed:  {},
		AlertStateUnprocessed: {},
	}

	labels := map[string]int{}
	for _, alert := range ag.Alerts {
		for _, l := range alert.Labels {
			if _, ok := labels[l.Name]; !ok {
				labels[l.Name] = 0
			}
			labels[l.Name]++
		}
	}

	labelNames := map[string]struct{}{}
	totalAlerts := len(ag.Alerts)
	for k, totalValues := range labels {
		if totalValues == totalAlerts {
			labelNames[k] = struct{}{}
		}
	}

	for _, alert := range ag.Alerts {
		for _, l := range alert.Labels {
			if _, ok := labelNames[l.Name]; !ok {
				continue
			}
			if _, ok := ag.AllLabels[alert.State][l.Name]; !ok {
				ag.AllLabels[alert.State][l.Name] = []string{}
			}
			if !slices.StringInSlice(ag.AllLabels[alert.State][l.Name], l.Value) {
				ag.AllLabels[alert.State][l.Name] = append(ag.AllLabels[alert.State][l.Name], l.Value)
			}
		}
	}
	for state := range ag.AllLabels {
		for k := range ag.AllLabels[state] {
			sort.Strings(ag.AllLabels[state][k])
		}
	}
}

// DedupSharedMaps will find all labels and annotations shared by all alerts
// in this group and moved them to Shared namespace
func (ag *APIAlertGroup) DedupSharedMaps(ignoredLabels []string) {
	ag.populateAllLabels()
	// remove all labels that are used for grouping
	ag.removeGroupingLabels(ignoredLabels)
	// don't dedup if we only have a single alert in this group
	if len(ag.Alerts) > 1 {
		ag.dedupLabels()
		ag.dedupAnnotations()
		ag.dedupSilences()
		ag.dedupClusters()
	} else {
		ag.Shared = APIAlertGroupSharedMaps{
			Labels:      Labels{},
			Annotations: Annotations{},
			Silences:    map[string][]string{},
			Clusters:    []string{},
		}
	}
	ag.dedupSources()
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
	Strip                SilenceFormStripSettings `json:"strip"`
	DefaultAlertmanagers []string                 `json:"defaultAlertmanagers"`
}

type AlertAcknowledgementSettings struct {
	Enabled         bool   `json:"enabled"`
	DurationSeconds int    `json:"durationSeconds"`
	Author          string `json:"author"`
	Comment         string `json:"comment"`
}

type LabelSettings struct {
	IsStatic    bool `json:"isStatic"`
	IsValueOnly bool `json:"isValueOnly"`
}

type LabelsSettings map[string]LabelSettings

// Settings is used to export karma configuration that is used by UI
// nolint: maligned
type Settings struct {
	AnnotationsDefaultHidden bool                         `json:"annotationsDefaultHidden"`
	AnnotationsHidden        []string                     `json:"annotationsHidden"`
	AnnotationsVisible       []string                     `json:"annotationsVisible"`
	AnnotationsAllowHTML     bool                         `json:"annotationsEnableHTML"`
	Sorting                  SortSettings                 `json:"sorting"`
	SilenceForm              SilenceFormSettings          `json:"silenceForm"`
	AlertAcknowledgement     AlertAcknowledgementSettings `json:"alertAcknowledgement"`
	HistoryEnabled           bool                         `json:"historyEnabled"`
	GridGroupLimit           int                          `json:"gridGroupLimit"`
	Labels                   LabelsSettings               `json:"labels"`
}

type AuthenticationInfo struct {
	Enabled  bool     `json:"enabled"`
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
}

type APIGrid struct {
	LabelName   string          `json:"labelName"`
	LabelValue  string          `json:"labelValue"`
	AlertGroups []APIAlertGroup `json:"alertGroups"`
	TotalGroups int             `json:"totalGroups"`
	StateCount  map[string]int  `json:"stateCount"`
}

// nolint: maligned
type AlertsRequest struct {
	Filters           []string       `json:"filters"`
	GridLabel         string         `json:"gridLabel"`
	GridLimits        map[string]int `json:"gridLimits"`
	GridSortReverse   bool           `json:"gridSortReverse"`
	SortOrder         string         `json:"sortOrder"`
	SortLabel         string         `json:"sortLabel"`
	SortReverse       bool           `json:"sortReverse"`
	DefaultGroupLimit int            `json:"defaultGroupLimit"`
	GroupLimits       map[string]int `json:"groupLimits"`
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
	LabelNames     []string                      `json:"labelNames"`
	Colors         LabelsColorMap                `json:"colors"`
	Filters        []Filter                      `json:"filters"`
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

type Counters struct {
	Total    int                `json:"total"`
	Counters LabelNameStatsList `json:"counters"`
}
