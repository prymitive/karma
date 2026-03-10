package models

import (
	"cmp"
	"fmt"
	"net/url"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/fvbommel/sortorder"
	"github.com/prometheus/prometheus/model/labels"
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

func (c *Color) String() string {
	return fmt.Sprintf("rgba(%d,%d,%d,%d)", c.Red, c.Green, c.Blue, c.Alpha)
}

// LabelColors holds color information for labels that should be colored in the UI
// every configured label will have a distinct coloring for each value
type LabelColors struct {
	Background string `json:"background"`
	Brightness int32  `json:"brightness"`
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

func CompareLabelValueStats(a, b LabelValueStats) int {
	if a.Hits != b.Hits {
		return cmp.Compare(b.Hits, a.Hits)
	}
	if sortorder.NaturalLess(a.Value, b.Value) {
		return -1
	}
	if sortorder.NaturalLess(b.Value, a.Value) {
		return 1
	}
	return 0
}

// LabelNameStats is used in the overview modal, it shows top labels across alerts
type LabelNameStats struct {
	Name   string              `json:"name"`
	Values LabelValueStatsList `json:"values"`
	Hits   int                 `json:"hits"`
}

type LabelNameStatsList []LabelNameStats

func CompareLabelNameStats(a, b LabelNameStats) int {
	if a.Hits != b.Hits {
		return cmp.Compare(b.Hits, a.Hits)
	}
	return cmp.Compare(a.Name, b.Name)
}

// AlertGroupSharedMaps holds data shared across all alerts in a group.
// Populated by AlertGroup.DedupSharedMaps.
type AlertGroupSharedMaps struct {
	Annotations Annotations
	Labels      labels.Labels
	Silences    map[string][]string
	Sources     []string
	Clusters    []string
}

// APIAlertGroupSharedMaps is the JSON representation of AlertGroupSharedMaps.
type APIAlertGroupSharedMaps struct {
	Annotations Annotations         `json:"annotations"`
	Labels      OrderedLabels       `json:"labels"`
	Silences    map[string][]string `json:"silences"`
	Sources     []string            `json:"sources"`
	Clusters    []string            `json:"clusters"`
}

// APIAlertGroup is how AlertGroup is returned in the API response.
// All labels and annotations that are shared between all alerts in given group
// are moved to Shared namespace, each alert instance only tracks labels and
// annotations that are unique to that instance.
type APIAlertGroup struct {
	LatestStartsAt    time.Time                      `json:"-"`
	AllLabels         map[string]map[string][]string `json:"allLabels"`
	AlertmanagerCount map[string]int                 `json:"alertmanagerCount"`
	StateCount        map[string]int                 `json:"stateCount"`
	Receiver          string                         `json:"receiver"`
	ID                string                         `json:"id"`
	Shared            APIAlertGroupSharedMaps        `json:"shared"`
	Labels            OrderedLabels                  `json:"labels"`
	Alerts            []APIAlert                     `json:"alerts"`
	TotalAlerts       int                            `json:"totalAlerts"`
}

// NewAPIAlertGroup converts an AlertGroup into its API representation.
// ag must have been processed by DedupSharedMaps before calling this.
func NewAPIAlertGroup(ag AlertGroup, shared AlertGroupSharedMaps, allLabels map[string]map[string][]string, totalAlerts int) APIAlertGroup {
	alerts := make([]APIAlert, len(ag.Alerts))
	for i, a := range ag.Alerts {
		alerts[i] = APIAlert{
			StartsAt:     a.StartsAt,
			State:        a.State.String(),
			Receiver:     a.Receiver,
			LabelsFP:     a.LabelsFP,
			Annotations:  a.Annotations,
			Labels:       LabelsToOrderedLabels(a.Labels),
			Alertmanager: a.Alertmanager,
		}
	}
	return APIAlertGroup{
		AllLabels:         allLabels,
		Labels:            LabelsToOrderedLabels(ag.Labels),
		Alerts:            alerts,
		AlertmanagerCount: ag.AlertmanagerCount,
		StateCount:        ag.StateCount,
		Receiver:          ag.Receiver,
		ID:                ag.ID,
		LatestStartsAt:    ag.LatestStartsAt,
		Shared: APIAlertGroupSharedMaps{
			Annotations: shared.Annotations,
			Labels:      LabelsToOrderedLabels(shared.Labels),
			Silences:    shared.Silences,
			Sources:     shared.Sources,
			Clusters:    shared.Clusters,
		},
		TotalAlerts: totalAlerts,
	}
}

func (ag *AlertGroup) dedupLabels(shared *AlertGroupSharedMaps) {
	totalAlerts := len(ag.Alerts)

	labelCounts := make(map[string]int, len(ag.Alerts))

	for _, alert := range ag.Alerts {
		alert.Labels.Range(func(l labels.Label) {
			key := l.Name + "\n" + l.Value
			labelCounts[key]++
		})
	}

	sharedPairs := make([]string, 0, len(labelCounts)*2)
	alertPairs := make([]string, 0, len(labelCounts)*2)
	sharedSeen := map[string]struct{}{}

	for i, alert := range ag.Alerts {
		alertPairs = alertPairs[:0]
		alert.Labels.Range(func(l labels.Label) {
			key := l.Name + "\n" + l.Value
			if labelCounts[key] == totalAlerts {
				if _, ok := sharedSeen[l.Name]; !ok {
					sharedSeen[l.Name] = struct{}{}
					sharedPairs = append(sharedPairs, l.Name, l.Value)
				}
			} else {
				alertPairs = append(alertPairs, l.Name, l.Value)
			}
		})
		ag.Alerts[i].Labels = labels.FromStrings(alertPairs...)
	}

	shared.Labels = labels.FromStrings(sharedPairs...)
}

func (ag *AlertGroup) removeGroupingLabels(dropNames []string) {
	b := labels.NewBuilder(ag.Labels)
	for _, name := range dropNames {
		b.Del(name)
	}
	ag.Labels = b.Labels()

	for i, alert := range ag.Alerts {
		b.Reset(alert.Labels)
		for _, name := range dropNames {
			b.Del(name)
		}
		ag.Labels.Range(func(l labels.Label) {
			b.Del(l.Name)
		})
		ag.Alerts[i].Labels = b.Labels()
	}
}

func (ag *AlertGroup) dedupAnnotations(shared *AlertGroupSharedMaps) {
	totalAlerts := len(ag.Alerts)

	annotationCount := map[string]int{}

	for _, alert := range ag.Alerts {
		for _, annotation := range alert.Annotations {
			key := annotation.Name + "\n" + annotation.Value
			annotationCount[key]++
		}
	}

	sharedAnnotations := Annotations{}
	sharedKeys := map[string]struct{}{}

	for i, alert := range ag.Alerts {
		newAlertAnnotations := Annotations{}
		for _, annotation := range alert.Annotations {
			key := annotation.Name + "\n" + annotation.Value
			if annotationCount[key] == totalAlerts {
				if _, ok := sharedKeys[key]; !ok {
					sharedAnnotations = append(sharedAnnotations, annotation)
					sharedKeys[key] = struct{}{}
				}
			} else {
				newAlertAnnotations = append(newAlertAnnotations, annotation)
			}
		}
		ag.Alerts[i].Annotations = newAlertAnnotations
	}

	shared.Annotations = sharedAnnotations
}

func (ag *AlertGroup) dedupSilences(shared *AlertGroupSharedMaps) {
	shared.Silences = map[string][]string{}

	silencesByCluster := map[string]map[string]int{}

	for _, alert := range ag.Alerts {
		// process each cluster only once, rather than each alertmanager instance
		clusters := map[string]struct{}{}
		for _, am := range alert.Alertmanager {
			if _, ok := clusters[am.Cluster]; ok {
				continue
			}
			clusters[am.Cluster] = struct{}{}
			for _, silenceID := range am.SilencedBy {
				if _, ok := silencesByCluster[am.Cluster]; !ok {
					silencesByCluster[am.Cluster] = map[string]int{}
				}
				silencesByCluster[am.Cluster][silenceID]++
			}
		}
	}

	totalAlerts := len(ag.Alerts)
	for cluster, silenceCountMap := range silencesByCluster {
		for silenceID, affectedAlertsCount := range silenceCountMap {
			if affectedAlertsCount == totalAlerts {
				_, ok := shared.Silences[cluster]
				if !ok {
					shared.Silences[cluster] = []string{}
				}
				shared.Silences[cluster] = append(shared.Silences[cluster], silenceID)
				// sort to have stable order of silences
				sort.Strings(shared.Silences[cluster])
			}
		}
	}
}

func (ag *AlertGroup) dedupSources(shared *AlertGroupSharedMaps) {
	shared.Sources = []string{}

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
		shared.Sources = append(shared.Sources, u)
	}
	sort.Strings(shared.Sources)
}

func (ag *AlertGroup) dedupClusters(shared *AlertGroupSharedMaps) {
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

	shared.Clusters = []string{}
	for cluster, alerts := range alertsPerCluster {
		if alerts == totalAlerts {
			shared.Clusters = append(shared.Clusters, cluster)
		}
	}
	sort.Strings(shared.Clusters)
}

func (ag *AlertGroup) populateAllLabels() map[string]map[string][]string {
	allLabels := map[string]map[string][]string{
		AlertStateActive.String():      {},
		AlertStateSuppressed.String():  {},
		AlertStateUnprocessed.String(): {},
	}

	totalAlerts := len(ag.Alerts)

	var estLabels int
	if totalAlerts > 0 {
		estLabels = ag.Alerts[0].Labels.Len()
	}

	labelNameCounts := make(map[string]int, estLabels)
	for _, alert := range ag.Alerts {
		alert.Labels.Range(func(l labels.Label) {
			labelNameCounts[l.Name]++
		})
	}

	for _, alert := range ag.Alerts {
		stateLabels := allLabels[alert.State.String()]
		alert.Labels.Range(func(l labels.Label) {
			if labelNameCounts[l.Name] != totalAlerts {
				return
			}
			vals := stateLabels[l.Name]
			if !slices.Contains(vals, l.Value) {
				stateLabels[l.Name] = append(vals, l.Value)
			}
		})
	}
	for state := range allLabels {
		for k := range allLabels[state] {
			sort.Strings(allLabels[state][k])
		}
	}
	return allLabels
}

// DedupSharedMaps finds all labels and annotations shared by all alerts
// in this group, moves them to shared maps, and removes grouping labels.
// It mutates ag.Alerts and ag.Labels in place.
func (ag *AlertGroup) DedupSharedMaps(ignoredLabels []string) (AlertGroupSharedMaps, map[string]map[string][]string) {
	allLabels := ag.populateAllLabels()
	// remove all labels that are used for grouping
	ag.removeGroupingLabels(ignoredLabels)

	var shared AlertGroupSharedMaps
	// don't dedup if we only have a single alert in this group
	if len(ag.Alerts) > 1 {
		ag.dedupLabels(&shared)
		ag.dedupAnnotations(&shared)
		ag.dedupSilences(&shared)
		ag.dedupClusters(&shared)
	} else {
		shared = AlertGroupSharedMaps{
			Labels:      labels.EmptyLabels(),
			Annotations: Annotations{},
			Silences:    map[string][]string{},
			Clusters:    []string{},
		}
	}
	ag.dedupSources(&shared)
	return shared, allLabels
}

// GridSettings exposes all grid settings from the config file
type GridSettings struct {
	Order   string `json:"order"`
	Label   string `json:"label"`
	Reverse bool   `json:"reverse"`
}

// SortSettings nests all settings specific to sorting
type SortSettings struct {
	ValueMapping map[string]map[string]string `json:"valueMapping"`
	Grid         GridSettings                 `json:"grid"`
}

type SilenceFormStripSettings struct {
	Labels []string `json:"labels"`
}

type SilenceFormSettings struct {
	Strip                SilenceFormStripSettings `json:"strip"`
	DefaultAlertmanagers []string                 `json:"defaultAlertmanagers"`
}

type AlertAcknowledgementSettings struct {
	Author          string `json:"author"`
	Comment         string `json:"comment"`
	DurationSeconds int    `json:"durationSeconds"`
	Enabled         bool   `json:"enabled"`
}

type LabelSettings struct {
	IsStatic    bool `json:"isStatic"`
	IsValueOnly bool `json:"isValueOnly"`
}

type LabelsSettings map[string]LabelSettings

// Settings is used to export karma configuration that is used by UI
// nolint: maligned
type Settings struct {
	Labels                   LabelsSettings               `json:"labels"`
	Sorting                  SortSettings                 `json:"sorting"`
	SilenceForm              SilenceFormSettings          `json:"silenceForm"`
	AnnotationsHidden        []string                     `json:"annotationsHidden"`
	AnnotationsVisible       []string                     `json:"annotationsVisible"`
	AlertAcknowledgement     AlertAcknowledgementSettings `json:"alertAcknowledgement"`
	GridGroupLimit           int                          `json:"gridGroupLimit"`
	AnnotationsDefaultHidden bool                         `json:"annotationsDefaultHidden"`
	AnnotationsAllowHTML     bool                         `json:"annotationsEnableHTML"`
	HistoryEnabled           bool                         `json:"historyEnabled"`
}

type AuthenticationInfo struct {
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
	Enabled  bool     `json:"enabled"`
}

type APIGrid struct {
	StateCount  map[string]int  `json:"stateCount"`
	LabelName   string          `json:"labelName"`
	LabelValue  string          `json:"labelValue"`
	AlertGroups []APIAlertGroup `json:"alertGroups"`
	TotalGroups int             `json:"totalGroups"`
}

// nolint: maligned
type AlertsRequest struct {
	GridLimits        map[string]int `json:"gridLimits"`
	GroupLimits       map[string]int `json:"groupLimits"`
	GridLabel         string         `json:"gridLabel"`
	SortOrder         string         `json:"sortOrder"`
	SortLabel         string         `json:"sortLabel"`
	Filters           []string       `json:"filters"`
	DefaultGroupLimit int            `json:"defaultGroupLimit"`
	GridSortReverse   bool           `json:"gridSortReverse"`
	SortReverse       bool           `json:"sortReverse"`
}

// AlertsResponse is the structure of JSON response UI will use to get alert data
type AlertsResponse struct {
	Settings       Settings                      `json:"settings"`
	Silences       map[string]map[string]Silence `json:"silences"`
	Colors         LabelsColorMap                `json:"colors"`
	Status         string                        `json:"status"`
	Timestamp      string                        `json:"timestamp"`
	Version        string                        `json:"version"`
	Authentication AuthenticationInfo            `json:"authentication"`
	Grids          []APIGrid                     `json:"grids"`
	LabelNames     []string                      `json:"labelNames"`
	Filters        []Filter                      `json:"filters"`
	Receivers      []string                      `json:"receivers"`
	Upstreams      AlertmanagerAPISummary        `json:"upstreams"`
	TotalAlerts    int                           `json:"totalAlerts"`
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal representation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}

type Counters struct {
	Counters LabelNameStatsList `json:"counters"`
	Total    int                `json:"total"`
}
