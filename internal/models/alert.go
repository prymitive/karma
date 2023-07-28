package models

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/fvbommel/sortorder"

	"github.com/prymitive/karma/internal/config"
)

// AlertStateUnprocessed means that Alertmanager notify didn't yet process it
// and AM doesn't know if alert is active or suppressed
const AlertStateUnprocessed = "unprocessed"

// AlertStateActive is the state in which we know that the alert should fire
const AlertStateActive = "active"

// AlertStateSuppressed means that we know that alert is silenced or inhibited
const AlertStateSuppressed = "suppressed"

// AlertStateList exports all alert states so other packages can get this list
var AlertStateList = []string{
	AlertStateUnprocessed,
	AlertStateActive,
	AlertStateSuppressed,
}

type Label struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func (l Label) String() string {
	return fmt.Sprintf("%s=\"%s\"", l.Name, l.Value)
}

type Labels []Label

func (ls Labels) String() string {
	var s []string
	for _, l := range ls {
		s = append(s, l.String())
	}
	return strings.Join(s, ",")
}

func (ls Labels) Map() map[string]string {
	m := make(map[string]string, len(ls))
	for _, l := range ls {
		m[l.Name] = l.Value
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
		if ls[i].Name == name {
			ai = index
		} else if ls[j].Name == name {
			aj = index
		}
		if ai >= 0 && aj >= 0 {
			return ai < aj
		}
	}
	if ai != aj {
		return aj < ai
	}
	if ls[i].Name == ls[j].Name {
		return sortorder.NaturalLess(ls[i].Value, ls[j].Value)
	}
	return sortorder.NaturalLess(ls[i].Name, ls[j].Name)
}

func (ls Labels) Get(name string) *Label {
	for _, l := range ls {
		l := l
		if l.Name == name {
			return &l
		}
	}
	return nil
}

func (ls Labels) GetValue(name string) string {
	for _, l := range ls {
		if l.Name == name {
			return l.Value
		}
	}
	return ""
}

func (ls Labels) Add(l Label) Labels {
	if ls.Get(l.Name) != nil {
		return ls
	}
	return append(ls, l)
}

func (ls Labels) Set(name, value string) Labels {
	if ls.Get(name) != nil {
		return ls
	}
	return append(ls, Label{Name: name, Value: value})
}

// Alert is vanilla alert + some additional attributes
// karma extends an alert object with:
//   - Links map, it's generated from annotations if annotation value is an url
//     it's pulled out of annotation map and returned under links field,
//     karma UI used this to show links differently than other annotations
type Alert struct {
	Annotations Annotations `json:"annotations"`
	Labels      Labels      `json:"labels"`
	StartsAt    time.Time   `json:"startsAt"`
	State       string      `json:"state"`
	// those are not exposed in JSON, Alertmanager specific value will be in kept
	// in the Alertmanager slice
	// skip those when generating alert fingerprint too
	Fingerprint  string   `json:"-"`
	GeneratorURL string   `json:"-"`
	SilencedBy   []string `json:"-"`
	InhibitedBy  []string `json:"-"`
	// karma fields
	Alertmanager []AlertmanagerInstance `json:"alertmanager"`
	Receiver     string                 `json:"receiver"`
	// fingerprints are precomputed for speed
	LabelsFP  string `json:"id"`
	contentFP string
}

var seps = []byte{'\xff'}

// UpdateFingerprints will generate a new set of fingerprints for this alert
func (a *Alert) UpdateFingerprints() {
	h := xxhash.New()
	for _, l := range a.Labels {
		_, _ = h.WriteString(l.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(l.Value)
		_, _ = h.Write(seps)
	}
	a.LabelsFP = fmt.Sprintf("%x", h.Sum64())

	h.Reset()
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
	for _, l := range a.Labels {
		_, _ = h.WriteString(l.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(l.Value)
		_, _ = h.Write(seps)
	}
	_, _ = h.WriteString(a.StartsAt.Format(time.RFC3339))
	_, _ = h.WriteString(a.State)
	for _, am := range a.Alertmanager {
		_, _ = h.WriteString(am.Fingerprint)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Name)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.Cluster)
		_, _ = h.Write(seps)
		_, _ = h.WriteString(am.State)
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
	a.contentFP = fmt.Sprintf("%x", h.Sum64())
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
