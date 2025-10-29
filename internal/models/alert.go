package models

import (
	"encoding/json"
	"strconv"
	"time"
	"unique"

	"github.com/cespare/xxhash/v2"
	"github.com/fvbommel/sortorder"

	"github.com/prymitive/karma/internal/config"
)

// AlertStateUnprocessed means that Alertmanager notify didn't yet process it
// and AM doesn't know if alert is active or suppressed
var AlertStateUnprocessed = NewUniqueString("unprocessed")

// AlertStateActive is the state in which we know that the alert should fire
var AlertStateActive = NewUniqueString("active")

// AlertStateSuppressed means that we know that alert is silenced or inhibited
var AlertStateSuppressed = NewUniqueString("suppressed")

// AlertStateList exports all alert states so other packages can get this list
var AlertStateList = []UniqueString{
	AlertStateUnprocessed,
	AlertStateActive,
	AlertStateSuppressed,
}

type UniqueString struct {
	unique.Handle[string]
}

func NewUniqueString(s string) UniqueString {
	return UniqueString{Handle: unique.Make(s)}
}

func (us *UniqueString) MarshalJSON() ([]byte, error) {
	return json.Marshal(us.Value())
}

func (us *UniqueString) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	us.Handle = unique.Make(s)
	return nil
}

type Label struct {
	Name  UniqueString `json:"name"`
	Value UniqueString `json:"value"`
}

type Labels []Label

func (ls Labels) Map() map[string]string {
	m := make(map[string]string, len(ls))
	for _, l := range ls {
		m[l.Name.Value()] = l.Value.Value()
	}
	return m
}

func (ls Labels) Len() int {
	return len(ls)
}

func (ls Labels) Swap(i, j int) {
	ls[i], ls[j] = ls[j], ls[i]
}

func (ls Labels) Less(i, j int) bool {
	ai, aj := -1, -1
	for index, name := range config.Config.Labels.Order {
		if ls[i].Name.Value() == name {
			ai = index
		} else if ls[j].Name.Value() == name {
			aj = index
		}
		if ai >= 0 && aj >= 0 {
			return ai < aj
		}
	}
	if ai != aj {
		return aj < ai
	}
	if ls[i].Name.Value() == ls[j].Name.Value() {
		return sortorder.NaturalLess(ls[i].Value.Value(), ls[j].Value.Value())
	}
	return sortorder.NaturalLess(ls[i].Name.Value(), ls[j].Name.Value())
}

func (ls Labels) Get(name string) *Label {
	for i, l := range ls {
		if l.Name.Value() == name {
			return &ls[i]
		}
	}
	return nil
}

func (ls Labels) GetValue(name string) string {
	for _, l := range ls {
		if l.Name.Value() == name {
			return l.Value.Value()
		}
	}
	return ""
}

func (ls Labels) Add(l Label) Labels {
	if ls.Get(l.Name.Value()) != nil {
		return ls
	}
	return append(ls, l)
}

func (ls Labels) Set(name, value string) Labels {
	if ls.Get(name) != nil {
		return ls
	}
	return append(ls, Label{Name: NewUniqueString(name), Value: NewUniqueString(value)})
}

// Alert is vanilla alert + some additional attributes
// karma extends an alert object with:
//   - Links map, it's generated from annotations if annotation value is an url
//     it's pulled out of annotation map and returned under links field,
//     karma UI used this to show links differently than other annotations
type Alert struct {
	StartsAt     time.Time    `json:"startsAt"`
	State        UniqueString `json:"state"`
	Fingerprint  string       `json:"-"`
	GeneratorURL string       `json:"-"`
	Receiver     UniqueString `json:"receiver"`
	LabelsFP     string       `json:"id"`
	contentFP    string
	Annotations  Annotations            `json:"annotations"`
	Labels       Labels                 `json:"labels"`
	SilencedBy   []string               `json:"-"`
	InhibitedBy  []string               `json:"-"`
	Alertmanager []AlertmanagerInstance `json:"alertmanager"`
}

var seps = []byte{'\xff'}

// UpdateFingerprints will generate a new set of fingerprints for this alert
func (a *Alert) UpdateFingerprints() {
	h := xxhash.New()
	for _, l := range a.Labels {
		_, _ = h.WriteString(l.Name.Value())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(l.Value.Value())
		_, _ = h.Write(seps)
	}
	a.LabelsFP = strconv.FormatUint(h.Sum64(), 16)

	h.Reset()
	for _, a := range a.Annotations {
		_, _ = h.WriteString(a.Name.Value())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(a.Value.Value())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.IsAction))
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.IsLink))
		_, _ = h.Write(seps)
		_, _ = h.WriteString(strconv.FormatBool(a.Visible))
		_, _ = h.Write(seps)

	}
	for _, l := range a.Labels {
		_, _ = h.WriteString(l.Name.Value())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(l.Value.Value())
		_, _ = h.Write(seps)
	}
	_, _ = h.WriteString(a.StartsAt.Format(time.RFC3339))
	_, _ = h.WriteString(a.State.Value())
	for _, am := range a.Alertmanager {
		_, _ = h.WriteString(am.Fingerprint)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Cluster)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.State.Value())
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
	_, _ = h.WriteString(a.Receiver.Value())
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
