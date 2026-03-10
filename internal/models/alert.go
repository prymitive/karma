package models

import (
	"cmp"
	"encoding/json"
	"slices"
	"strconv"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/fvbommel/sortorder"
	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/config"
)

// AlertState encodes the state of an alert as a compact uint8.
type AlertState uint8

const (
	// AlertStateUnprocessed means that Alertmanager notify didn't yet process it
	// and AM doesn't know if alert is active or suppressed
	AlertStateUnprocessed AlertState = iota
	// AlertStateActive is the state in which we know that the alert should fire
	AlertStateActive
	// AlertStateSuppressed means that we know that alert is silenced or inhibited
	AlertStateSuppressed
)

// AlertStateList exports all alert states so other packages can get this list
var AlertStateList = []AlertState{
	AlertStateUnprocessed,
	AlertStateActive,
	AlertStateSuppressed,
}

var alertStateToString = [3]string{"unprocessed", "active", "suppressed"}

var alertStateFromString = map[string]AlertState{
	"unprocessed": AlertStateUnprocessed,
	"active":      AlertStateActive,
	"suppressed":  AlertStateSuppressed,
}

func (s AlertState) String() string {
	if int(s) < len(alertStateToString) {
		return alertStateToString[s]
	}
	return "unprocessed"
}

func (s AlertState) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (s *AlertState) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	*s = ParseAlertState(str)
	return nil
}

// MarshalText implements encoding.TextMarshaler so AlertState can be used as
// a JSON map key.
func (s AlertState) MarshalText() ([]byte, error) {
	return []byte(s.String()), nil
}

// UnmarshalText implements encoding.TextUnmarshaler so AlertState can be used
// as a JSON map key.
func (s *AlertState) UnmarshalText(data []byte) error {
	*s = ParseAlertState(string(data))
	return nil
}

// AlertStateFromString looks up an AlertState by its string representation.
// Returns the state and true if found, or (AlertStateUnprocessed, false) otherwise.
func AlertStateFromString(s string) (AlertState, bool) {
	v, ok := alertStateFromString[s]
	return v, ok
}

// ParseAlertState converts a string to an AlertState.
func ParseAlertState(s string) AlertState {
	if v, ok := alertStateFromString[s]; ok {
		return v
	}
	return AlertStateUnprocessed
}

// OrderedLabel mirrors labels.Label for JSON serialization in the
// [{"name":"...","value":"..."}] format expected by the frontend.
type OrderedLabel struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// OrderedLabels is a slice of OrderedLabel used for JSON serialization.
// It preserves the display order configured via config.Config.Labels.Order.
type OrderedLabels []OrderedLabel

func (ol OrderedLabels) Get(name string) string {
	for _, l := range ol {
		if l.Name == name {
			return l.Value
		}
	}
	return ""
}

// LabelsToOrderedLabels converts prometheus Labels to OrderedLabels sorted
// by the configured display order.
func LabelsToOrderedLabels(ls labels.Labels) OrderedLabels {
	dl := make(OrderedLabels, 0, ls.Len())
	ls.Range(func(l labels.Label) {
		dl = append(dl, OrderedLabel{Name: l.Name, Value: l.Value})
	})
	slices.SortFunc(dl, CompareOrderedLabels)
	return dl
}

// orderedLabelsToLabels converts OrderedLabels back to prometheus Labels.
func orderedLabelsToLabels(ol OrderedLabels) labels.Labels {
	s := make([]string, 0, len(ol)*2)
	for _, l := range ol {
		s = append(s, l.Name, l.Value)
	}
	return labels.FromStrings(s...)
}

// CompareOrderedLabels sorts display labels by the configured label order,
// then by name, then by value using natural sort.
func CompareOrderedLabels(a, b OrderedLabel) int {
	ai, bi := -1, -1
	for index, name := range config.Config.Labels.Order {
		if a.Name == name {
			ai = index
		} else if b.Name == name {
			bi = index
		}
		if ai >= 0 && bi >= 0 {
			return cmp.Compare(ai, bi)
		}
	}
	if ai != bi {
		return cmp.Compare(bi, ai)
	}
	if a.Name == b.Name {
		if sortorder.NaturalLess(a.Value, b.Value) {
			return -1
		}
		if sortorder.NaturalLess(b.Value, a.Value) {
			return 1
		}
		return 0
	}
	if sortorder.NaturalLess(a.Name, b.Name) {
		return -1
	}
	if sortorder.NaturalLess(b.Name, a.Name) {
		return 1
	}
	return 0
}

// LabelsFromMap creates a Labels from a map, adding only keys not already present.
func LabelsFromMap(m map[string]string) labels.Labels {
	return labels.FromMap(m)
}

// LabelsSetIfMissing returns a new Labels with the given name/value added only if
// the name is not already present.
func LabelsSetIfMissing(ls labels.Labels, name, value string) labels.Labels {
	if ls.Has(name) {
		return ls
	}
	b := labels.NewBuilder(ls)
	b.Set(name, value)
	return b.Labels()
}

// Alert is vanilla alert + some additional attributes
// karma extends an alert object with:
//   - Links map, it's generated from annotations if annotation value is an url
//     it's pulled out of annotation map and returned under links field,
//     karma UI used this to show links differently than other annotations
type Alert struct {
	StartsAt     time.Time `json:"startsAt"`
	Fingerprint  string    `json:"-"`
	GeneratorURL string    `json:"-"`
	Receiver     string    `json:"receiver"`
	LabelsFP     string    `json:"id"`
	contentFP    string
	Labels       labels.Labels          `json:"-"`
	Annotations  Annotations            `json:"annotations"`
	SilencedBy   []string               `json:"-"`
	InhibitedBy  []string               `json:"-"`
	Alertmanager []AlertmanagerInstance `json:"alertmanager"`
	State        AlertState             `json:"state"`
}

// APIAlert is the JSON-serializable representation of Alert.
// Labels are converted to OrderedLabels for the frontend.
type APIAlert struct {
	StartsAt     time.Time              `json:"startsAt"`
	State        string                 `json:"state"`
	Receiver     string                 `json:"receiver"`
	LabelsFP     string                 `json:"id"`
	Annotations  Annotations            `json:"annotations"`
	Labels       OrderedLabels          `json:"labels"`
	Alertmanager []AlertmanagerInstance `json:"alertmanager"`
}

func (a Alert) MarshalJSON() ([]byte, error) {
	return json.Marshal(APIAlert{
		StartsAt:     a.StartsAt,
		State:        a.State.String(),
		Receiver:     a.Receiver,
		LabelsFP:     a.LabelsFP,
		Annotations:  a.Annotations,
		Labels:       LabelsToOrderedLabels(a.Labels),
		Alertmanager: a.Alertmanager,
	})
}

func (a *Alert) UnmarshalJSON(data []byte) error {
	var j APIAlert
	if err := json.Unmarshal(data, &j); err != nil {
		return err
	}
	a.StartsAt = j.StartsAt
	a.State = ParseAlertState(j.State)
	a.Receiver = j.Receiver
	a.LabelsFP = j.LabelsFP
	a.Annotations = j.Annotations
	a.Labels = orderedLabelsToLabels(j.Labels)
	a.Alertmanager = j.Alertmanager
	return nil
}

var seps = []byte{'\xff'}

// UpdateFingerprints will generate a new set of fingerprints for this alert
func (a *Alert) UpdateFingerprints() {
	labelsHash := a.Labels.Hash()
	a.LabelsFP = strconv.FormatUint(labelsHash, 16)

	h := xxhash.New()
	for _, a := range a.Annotations {
		_, _ = h.WriteString(a.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(a.Value)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.IsAction))
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.IsLink))
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.Visible))
		_, _ = h.Write(seps)

	}
	_, _ = h.WriteString(strconv.FormatUint(labelsHash, 16))
	_, _ = h.Write(seps)
	_, _ = h.WriteString(a.StartsAt.Format(time.RFC3339))
	_, _ = h.WriteString(a.State.String())
	for _, am := range a.Alertmanager {
		_, _ = h.WriteString(am.Fingerprint)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Cluster)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.State.String())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.StartsAt.Format(time.RFC3339))
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Source)
		_, _ = h.Write(seps)
		for _, s := range am.SilencedBy {
			_, _ = h.WriteString(s)
			_, _ = h.Write(seps)
		}
		for _, s := range am.InhibitedBy {
			_, _ = h.WriteString(s)
			_, _ = h.Write(seps)
		}
	}
	_, _ = h.WriteString(a.Receiver)
	a.contentFP = strconv.FormatUint(h.Sum64(), 16)
}

// LabelsFingerprint is a checksum computed only from labels which should be
// unique for every alert
func (a *Alert) LabelsFingerprint() string {
	return a.LabelsFP
}

// ContentFingerprint is a checksum computed from entire alert object
func (a *Alert) ContentFingerprint() string {
	return a.contentFP
}
