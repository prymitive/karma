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
	"github.com/go-json-experiment/json/jsontext"
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

func (f Filter) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("text")
	w.str(f.Text)
	w.key("name")
	w.str(f.Name)
	w.key("matcher")
	w.str(f.Matcher)
	w.key("value")
	w.str(f.Value)
	w.key("hits")
	w.integer(f.Hits)
	w.key("isValid")
	w.boolean(f.IsValid)
	w.endObject()
	return w.err
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

func (lc LabelColors) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("background")
	w.str(lc.Background)
	w.key("brightness")
	w.integer32(lc.Brightness)
	w.endObject()
	return w.err
}

// LabelsColorMap is a map of "Label Key" -> "Label Value" -> karmaLabelColors
type LabelsColorMap map[string]map[string]LabelColors

func (m LabelsColorMap) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	for k, inner := range m {
		w.key(k)
		w.beginObject()
		for v, lc := range inner {
			w.key(v)
			w.beginObject()
			w.key("background")
			w.str(lc.Background)
			w.key("brightness")
			w.integer32(lc.Brightness)
			w.endObject()
		}
		w.endObject()
	}
	w.endObject()
	return w.err
}

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

func (lvs LabelValueStats) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("value")
	w.str(lvs.Value)
	w.key("raw")
	w.str(lvs.Raw)
	w.key("hits")
	w.integer(lvs.Hits)
	w.key("percent")
	w.integer(lvs.Percent)
	w.key("offset")
	w.integer(lvs.Offset)
	w.endObject()
	return w.err
}

func (l LabelValueStatsList) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginArray()
	for _, v := range l {
		w.beginObject()
		w.key("value")
		w.str(v.Value)
		w.key("raw")
		w.str(v.Raw)
		w.key("hits")
		w.integer(v.Hits)
		w.key("percent")
		w.integer(v.Percent)
		w.key("offset")
		w.integer(v.Offset)
		w.endObject()
	}
	w.endArray()
	return w.err
}

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

func (lns LabelNameStats) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("name")
	w.str(lns.Name)
	w.key("values")
	w.beginArray()
	for _, v := range lns.Values {
		w.beginObject()
		w.key("value")
		w.str(v.Value)
		w.key("raw")
		w.str(v.Raw)
		w.key("hits")
		w.integer(v.Hits)
		w.key("percent")
		w.integer(v.Percent)
		w.key("offset")
		w.integer(v.Offset)
		w.endObject()
	}
	w.endArray()
	w.key("hits")
	w.integer(lns.Hits)
	w.endObject()
	return w.err
}

func (l LabelNameStatsList) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginArray()
	for _, lns := range l {
		w.beginObject()
		w.key("name")
		w.str(lns.Name)
		w.key("values")
		w.beginArray()
		for _, v := range lns.Values {
			w.beginObject()
			w.key("value")
			w.str(v.Value)
			w.key("raw")
			w.str(v.Raw)
			w.key("hits")
			w.integer(v.Hits)
			w.key("percent")
			w.integer(v.Percent)
			w.key("offset")
			w.integer(v.Offset)
			w.endObject()
		}
		w.endArray()
		w.key("hits")
		w.integer(lns.Hits)
		w.endObject()
	}
	w.endArray()
	return w.err
}

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

func (s APIAlertGroupSharedMaps) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	s.marshalTo(&w)
	return w.err
}

func (s *APIAlertGroupSharedMaps) marshalTo(w *jsonWriter) {
	w.beginObject()
	w.key("annotations")
	w.beginArray()
	for i := range s.Annotations {
		s.Annotations[i].marshalTo(w)
	}
	w.endArray()
	w.key("labels")
	w.beginArray()
	for _, l := range s.Labels {
		w.beginObject()
		w.key("name")
		w.str(l.Name)
		w.key("value")
		w.str(l.Value)
		w.endObject()
	}
	w.endArray()
	w.key("silences")
	w.mapStringStringSlice(s.Silences)
	w.key("sources")
	w.strings(s.Sources)
	w.key("clusters")
	w.strings(s.Clusters)
	w.endObject()
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

func (ag APIAlertGroup) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("allLabels")
	w.beginObject()
	for state, labels := range ag.AllLabels {
		w.key(state)
		w.mapStringStringSlice(labels)
	}
	w.endObject()
	w.key("alertmanagerCount")
	w.mapStringInt(ag.AlertmanagerCount)
	w.key("stateCount")
	w.mapStringInt(ag.StateCount)
	w.key("receiver")
	w.str(ag.Receiver)
	w.key("id")
	w.str(ag.ID)
	w.key("shared")
	ag.Shared.marshalTo(&w)
	w.key("labels")
	w.beginArray()
	for _, l := range ag.Labels {
		w.beginObject()
		w.key("name")
		w.str(l.Name)
		w.key("value")
		w.str(l.Value)
		w.endObject()
	}
	w.endArray()
	w.key("alerts")
	w.beginArray()
	for i := range ag.Alerts {
		ag.Alerts[i].marshalTo(&w)
	}
	w.endArray()
	w.key("totalAlerts")
	w.integer(ag.TotalAlerts)
	w.endObject()
	return w.err
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
	alertLabelPairs := make([][]labels.Label, len(ag.Alerts))

	for i, alert := range ag.Alerts {
		alert.Labels.Range(func(l labels.Label) {
			key := l.Name + "\n" + l.Value
			labelCounts[key]++
			alertLabelPairs[i] = append(alertLabelPairs[i], l)
		})
	}

	sharedPairs := make([]string, 0, len(labelCounts)*2)
	alertPairs := make([]string, 0, len(labelCounts)*2)
	sharedSeen := map[string]struct{}{}

	for i, pairs := range alertLabelPairs {
		alertPairs = alertPairs[:0]
		for _, l := range pairs {
			key := l.Name + "\n" + l.Value
			if labelCounts[key] == totalAlerts {
				if _, ok := sharedSeen[l.Name]; !ok {
					sharedSeen[l.Name] = struct{}{}
					sharedPairs = append(sharedPairs, l.Name, l.Value)
				}
			} else {
				alertPairs = append(alertPairs, l.Name, l.Value)
			}
		}
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
	alertLabelPairs := make([][]labels.Label, totalAlerts)
	for i, alert := range ag.Alerts {
		alert.Labels.Range(func(l labels.Label) {
			labelNameCounts[l.Name]++
			alertLabelPairs[i] = append(alertLabelPairs[i], l)
		})
	}

	for i, pairs := range alertLabelPairs {
		stateLabels := allLabels[ag.Alerts[i].State.String()]
		for _, l := range pairs {
			if labelNameCounts[l.Name] != totalAlerts {
				continue
			}
			vals := stateLabels[l.Name]
			if !slices.Contains(vals, l.Value) {
				stateLabels[l.Name] = append(vals, l.Value)
			}
		}
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

func (gs GridSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("order")
	w.str(gs.Order)
	w.key("label")
	w.str(gs.Label)
	w.key("reverse")
	w.boolean(gs.Reverse)
	w.endObject()
	return w.err
}

// SortSettings nests all settings specific to sorting
type SortSettings struct {
	ValueMapping map[string]map[string]string `json:"valueMapping"`
	Grid         GridSettings                 `json:"grid"`
}

func (ss SortSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("valueMapping")
	w.mapStringMapStringString(ss.ValueMapping)
	w.key("grid")
	w.beginObject()
	w.key("order")
	w.str(ss.Grid.Order)
	w.key("label")
	w.str(ss.Grid.Label)
	w.key("reverse")
	w.boolean(ss.Grid.Reverse)
	w.endObject()
	w.endObject()
	return w.err
}

type SilenceFormStripSettings struct {
	Labels []string `json:"labels"`
}

func (s SilenceFormStripSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("labels")
	w.strings(s.Labels)
	w.endObject()
	return w.err
}

type SilenceFormSettings struct {
	Strip                SilenceFormStripSettings `json:"strip"`
	DefaultAlertmanagers []string                 `json:"defaultAlertmanagers"`
}

func (s SilenceFormSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("strip")
	w.beginObject()
	w.key("labels")
	w.strings(s.Strip.Labels)
	w.endObject()
	w.key("defaultAlertmanagers")
	w.strings(s.DefaultAlertmanagers)
	w.endObject()
	return w.err
}

type AlertAcknowledgementSettings struct {
	Author          string `json:"author"`
	Comment         string `json:"comment"`
	DurationSeconds int    `json:"durationSeconds"`
	Enabled         bool   `json:"enabled"`
}

func (s AlertAcknowledgementSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("author")
	w.str(s.Author)
	w.key("comment")
	w.str(s.Comment)
	w.key("durationSeconds")
	w.integer(s.DurationSeconds)
	w.key("enabled")
	w.boolean(s.Enabled)
	w.endObject()
	return w.err
}

type LabelSettings struct {
	IsStatic    bool `json:"isStatic"`
	IsValueOnly bool `json:"isValueOnly"`
}

type LabelsSettings map[string]LabelSettings

func (ls LabelsSettings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	for k, v := range ls {
		w.key(k)
		w.beginObject()
		w.key("isStatic")
		w.boolean(v.IsStatic)
		w.key("isValueOnly")
		w.boolean(v.IsValueOnly)
		w.endObject()
	}
	w.endObject()
	return w.err
}

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

func (s Settings) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("labels")
	w.beginObject()
	for k, v := range s.Labels {
		w.key(k)
		w.beginObject()
		w.key("isStatic")
		w.boolean(v.IsStatic)
		w.key("isValueOnly")
		w.boolean(v.IsValueOnly)
		w.endObject()
	}
	w.endObject()
	w.key("sorting")
	w.beginObject()
	w.key("valueMapping")
	w.mapStringMapStringString(s.Sorting.ValueMapping)
	w.key("grid")
	w.beginObject()
	w.key("order")
	w.str(s.Sorting.Grid.Order)
	w.key("label")
	w.str(s.Sorting.Grid.Label)
	w.key("reverse")
	w.boolean(s.Sorting.Grid.Reverse)
	w.endObject()
	w.endObject()
	w.key("silenceForm")
	w.beginObject()
	w.key("strip")
	w.beginObject()
	w.key("labels")
	w.strings(s.SilenceForm.Strip.Labels)
	w.endObject()
	w.key("defaultAlertmanagers")
	w.strings(s.SilenceForm.DefaultAlertmanagers)
	w.endObject()
	w.key("annotationsHidden")
	w.strings(s.AnnotationsHidden)
	w.key("annotationsVisible")
	w.strings(s.AnnotationsVisible)
	w.key("alertAcknowledgement")
	w.beginObject()
	w.key("author")
	w.str(s.AlertAcknowledgement.Author)
	w.key("comment")
	w.str(s.AlertAcknowledgement.Comment)
	w.key("durationSeconds")
	w.integer(s.AlertAcknowledgement.DurationSeconds)
	w.key("enabled")
	w.boolean(s.AlertAcknowledgement.Enabled)
	w.endObject()
	w.key("gridGroupLimit")
	w.integer(s.GridGroupLimit)
	w.key("annotationsDefaultHidden")
	w.boolean(s.AnnotationsDefaultHidden)
	w.key("annotationsEnableHTML")
	w.boolean(s.AnnotationsAllowHTML)
	w.key("historyEnabled")
	w.boolean(s.HistoryEnabled)
	w.endObject()
	return w.err
}

type AuthenticationInfo struct {
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
	Enabled  bool     `json:"enabled"`
}

func (ai AuthenticationInfo) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("username")
	w.str(ai.Username)
	w.key("groups")
	w.strings(ai.Groups)
	w.key("enabled")
	w.boolean(ai.Enabled)
	w.endObject()
	return w.err
}

type APIGrid struct {
	StateCount  map[string]int  `json:"stateCount"`
	LabelName   string          `json:"labelName"`
	LabelValue  string          `json:"labelValue"`
	AlertGroups []APIAlertGroup `json:"alertGroups"`
	TotalGroups int             `json:"totalGroups"`
}

func (g APIGrid) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("stateCount")
	w.mapStringInt(g.StateCount)
	w.key("labelName")
	w.str(g.LabelName)
	w.key("labelValue")
	w.str(g.LabelValue)
	w.key("alertGroups")
	w.beginArray()
	for i := range g.AlertGroups {
		ag := &g.AlertGroups[i]
		w.beginObject()
		w.key("allLabels")
		w.beginObject()
		for state, labels := range ag.AllLabels {
			w.key(state)
			w.mapStringStringSlice(labels)
		}
		w.endObject()
		w.key("alertmanagerCount")
		w.mapStringInt(ag.AlertmanagerCount)
		w.key("stateCount")
		w.mapStringInt(ag.StateCount)
		w.key("receiver")
		w.str(ag.Receiver)
		w.key("id")
		w.str(ag.ID)
		w.key("shared")
		ag.Shared.marshalTo(&w)
		w.key("labels")
		w.beginArray()
		for _, l := range ag.Labels {
			w.beginObject()
			w.key("name")
			w.str(l.Name)
			w.key("value")
			w.str(l.Value)
			w.endObject()
		}
		w.endArray()
		w.key("alerts")
		w.beginArray()
		for j := range ag.Alerts {
			ag.Alerts[j].marshalTo(&w)
		}
		w.endArray()
		w.key("totalAlerts")
		w.integer(ag.TotalAlerts)
		w.endObject()
	}
	w.endArray()
	w.key("totalGroups")
	w.integer(g.TotalGroups)
	w.endObject()
	return w.err
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

func (r AlertsResponse) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("settings")
	// inline Settings marshal
	w.beginObject()
	w.key("labels")
	w.beginObject()
	for k, v := range r.Settings.Labels {
		w.key(k)
		w.beginObject()
		w.key("isStatic")
		w.boolean(v.IsStatic)
		w.key("isValueOnly")
		w.boolean(v.IsValueOnly)
		w.endObject()
	}
	w.endObject()
	w.key("sorting")
	w.beginObject()
	w.key("valueMapping")
	w.mapStringMapStringString(r.Settings.Sorting.ValueMapping)
	w.key("grid")
	w.beginObject()
	w.key("order")
	w.str(r.Settings.Sorting.Grid.Order)
	w.key("label")
	w.str(r.Settings.Sorting.Grid.Label)
	w.key("reverse")
	w.boolean(r.Settings.Sorting.Grid.Reverse)
	w.endObject()
	w.endObject()
	w.key("silenceForm")
	w.beginObject()
	w.key("strip")
	w.beginObject()
	w.key("labels")
	w.strings(r.Settings.SilenceForm.Strip.Labels)
	w.endObject()
	w.key("defaultAlertmanagers")
	w.strings(r.Settings.SilenceForm.DefaultAlertmanagers)
	w.endObject()
	w.key("annotationsHidden")
	w.strings(r.Settings.AnnotationsHidden)
	w.key("annotationsVisible")
	w.strings(r.Settings.AnnotationsVisible)
	w.key("alertAcknowledgement")
	w.beginObject()
	w.key("author")
	w.str(r.Settings.AlertAcknowledgement.Author)
	w.key("comment")
	w.str(r.Settings.AlertAcknowledgement.Comment)
	w.key("durationSeconds")
	w.integer(r.Settings.AlertAcknowledgement.DurationSeconds)
	w.key("enabled")
	w.boolean(r.Settings.AlertAcknowledgement.Enabled)
	w.endObject()
	w.key("gridGroupLimit")
	w.integer(r.Settings.GridGroupLimit)
	w.key("annotationsDefaultHidden")
	w.boolean(r.Settings.AnnotationsDefaultHidden)
	w.key("annotationsEnableHTML")
	w.boolean(r.Settings.AnnotationsAllowHTML)
	w.key("historyEnabled")
	w.boolean(r.Settings.HistoryEnabled)
	w.endObject()
	w.key("silences")
	w.beginObject()
	for cluster, silenceMap := range r.Silences {
		w.key(cluster)
		w.beginObject()
		for id, sil := range silenceMap {
			w.key(id)
			sil.marshalTo(&w)
		}
		w.endObject()
	}
	w.endObject()
	w.key("colors")
	w.beginObject()
	for k, inner := range r.Colors {
		w.key(k)
		w.beginObject()
		for v, lc := range inner {
			w.key(v)
			w.beginObject()
			w.key("background")
			w.str(lc.Background)
			w.key("brightness")
			w.integer32(lc.Brightness)
			w.endObject()
		}
		w.endObject()
	}
	w.endObject()
	w.key("status")
	w.str(r.Status)
	w.key("timestamp")
	w.str(r.Timestamp)
	w.key("version")
	w.str(r.Version)
	w.key("authentication")
	w.beginObject()
	w.key("username")
	w.str(r.Authentication.Username)
	w.key("groups")
	w.strings(r.Authentication.Groups)
	w.key("enabled")
	w.boolean(r.Authentication.Enabled)
	w.endObject()
	w.key("grids")
	w.beginArray()
	for i := range r.Grids {
		g := &r.Grids[i]
		w.beginObject()
		w.key("stateCount")
		w.mapStringInt(g.StateCount)
		w.key("labelName")
		w.str(g.LabelName)
		w.key("labelValue")
		w.str(g.LabelValue)
		w.key("alertGroups")
		w.beginArray()
		for j := range g.AlertGroups {
			ag := &g.AlertGroups[j]
			w.beginObject()
			w.key("allLabels")
			w.beginObject()
			for state, labels := range ag.AllLabels {
				w.key(state)
				w.mapStringStringSlice(labels)
			}
			w.endObject()
			w.key("alertmanagerCount")
			w.mapStringInt(ag.AlertmanagerCount)
			w.key("stateCount")
			w.mapStringInt(ag.StateCount)
			w.key("receiver")
			w.str(ag.Receiver)
			w.key("id")
			w.str(ag.ID)
			w.key("shared")
			ag.Shared.marshalTo(&w)
			w.key("labels")
			w.beginArray()
			for _, l := range ag.Labels {
				w.beginObject()
				w.key("name")
				w.str(l.Name)
				w.key("value")
				w.str(l.Value)
				w.endObject()
			}
			w.endArray()
			w.key("alerts")
			w.beginArray()
			for k := range ag.Alerts {
				ag.Alerts[k].marshalTo(&w)
			}
			w.endArray()
			w.key("totalAlerts")
			w.integer(ag.TotalAlerts)
			w.endObject()
		}
		w.endArray()
		w.key("totalGroups")
		w.integer(g.TotalGroups)
		w.endObject()
	}
	w.endArray()
	w.key("labelNames")
	w.strings(r.LabelNames)
	w.key("filters")
	w.beginArray()
	for _, f := range r.Filters {
		w.beginObject()
		w.key("text")
		w.str(f.Text)
		w.key("name")
		w.str(f.Name)
		w.key("matcher")
		w.str(f.Matcher)
		w.key("value")
		w.str(f.Value)
		w.key("hits")
		w.integer(f.Hits)
		w.key("isValid")
		w.boolean(f.IsValid)
		w.endObject()
	}
	w.endArray()
	w.key("receivers")
	w.strings(r.Receivers)
	w.key("upstreams")
	w.beginObject()
	w.key("clusters")
	w.mapStringStringSlice(r.Upstreams.Clusters)
	w.key("instances")
	w.beginArray()
	for i := range r.Upstreams.Instances {
		r.Upstreams.Instances[i].marshalTo(&w)
	}
	w.endArray()
	w.key("counters")
	w.beginObject()
	w.key("total")
	w.integer(r.Upstreams.Counters.Total)
	w.key("healthy")
	w.integer(r.Upstreams.Counters.Healthy)
	w.key("failed")
	w.integer(r.Upstreams.Counters.Failed)
	w.endObject()
	w.endObject()
	w.key("totalAlerts")
	w.integer(r.TotalAlerts)
	w.endObject()
	return w.err
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal representation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}

func (a Autocomplete) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("value")
	w.str(a.Value)
	w.key("tokens")
	w.strings(a.Tokens)
	w.endObject()
	return w.err
}

type Counters struct {
	Counters LabelNameStatsList `json:"counters"`
	Total    int                `json:"total"`
}

func (c Counters) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("counters")
	w.beginArray()
	for _, lns := range c.Counters {
		w.beginObject()
		w.key("name")
		w.str(lns.Name)
		w.key("values")
		w.beginArray()
		for _, v := range lns.Values {
			w.beginObject()
			w.key("value")
			w.str(v.Value)
			w.key("raw")
			w.str(v.Raw)
			w.key("hits")
			w.integer(v.Hits)
			w.key("percent")
			w.integer(v.Percent)
			w.key("offset")
			w.integer(v.Offset)
			w.endObject()
		}
		w.endArray()
		w.key("hits")
		w.integer(lns.Hits)
		w.endObject()
	}
	w.endArray()
	w.key("total")
	w.integer(c.Total)
	w.endObject()
	return w.err
}
