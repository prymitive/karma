package models

import (
	"fmt"
	"time"

	"github.com/cnf/structhash"
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

// Alert is vanilla alert + some additional attributes
// unsee extends an alert object with:
// * Links map, it's generated from annotations if annotation value is an url
//   it's pulled out of annotation map and returned under links field,
//   unsee UI used this to show links differently than other annotations
type Alert struct {
	Annotations Annotations       `json:"annotations"`
	Labels      map[string]string `json:"labels"`
	StartsAt    time.Time         `json:"startsAt"`
	EndsAt      time.Time         `json:"endsAt"`
	State       string            `json:"state"`
	// those are not exposed in JSON, Alertmanager specific value will be in kept
	// in the Alertmanager slice
	// skip those when generating alert fingerprint too
	GeneratorURL string   `json:"-" hash:"-"`
	SilencedBy   []string `json:"-" hash:"-"`
	InhibitedBy  []string `json:"-" hash:"-"`
	// unsee fields
	Alertmanager []AlertmanagerInstance `json:"alertmanager"`
	Receiver     string                 `json:"receiver"`
	// fingerprints are precomputed for speed
	labelsFP  string `hash:"-"`
	contentFP string `hash:"-"`
}

// UpdateFingerprints will generate a new set of fingerprints for this alert
// it should be called after modifying any field that isn't tagged with hash:"-"
func (a *Alert) UpdateFingerprints() {
	a.labelsFP = fmt.Sprintf("%x", structhash.Sha1(a.Labels, 1))
	a.contentFP = fmt.Sprintf("%x", structhash.Sha1(a, 1))
}

// LabelsFingerprint is a checksum computed only from labels which should be
// unique for every alert
func (a *Alert) LabelsFingerprint() string {
	return a.labelsFP
}

// ContentFingerprint is a checksum computed from entire alert object
// except some blacklisted fields tagged with hash:"-"
func (a *Alert) ContentFingerprint() string {
	return a.contentFP
}

// IsSilenced will return true if alert should be considered silenced
func (a *Alert) IsSilenced() bool {
	return (a.State == AlertStateSuppressed && len(a.SilencedBy) > 0)
}

// IsInhibited will return true if alert should be considered silenced
func (a *Alert) IsInhibited() bool {
	return (a.State == AlertStateSuppressed && len(a.InhibitedBy) > 0)
}

// IsActive will return true if alert is not suppressed in any way
func (a *Alert) IsActive() bool {
	return (a.State == AlertStateActive)
}
