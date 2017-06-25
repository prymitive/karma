package models

import "time"

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
// * Fingerprint, which is a sha1 of the entire alert
type Alert struct {
	Annotations  map[string]string `json:"annotations"`
	Labels       map[string]string `json:"labels"`
	StartsAt     time.Time         `json:"startsAt"`
	EndsAt       time.Time         `json:"endsAt"`
	GeneratorURL string            `json:"generatorURL"`
	State        string            `json:"state"`
	SilencedBy   []string          `json:"silencedBy"`
	InhibitedBy  []string          `json:"inhibitedBy"`
	// unsee fields
	Alertmanager []AlertmanagerUpstream `json:"alertmanager"`
	Receiver     string                 `json:"receiver"`
	Links        map[string]string      `json:"links"`
	ID           string                 `json:"-"`
	Fingerprint  string                 `json:"-"`
}

// IsSilenced will return true if alert should be considered silenced
func (a Alert) IsSilenced() bool {
	return (a.State == AlertStateSuppressed && len(a.SilencedBy) > 0)
}

// IsInhibited will return true if alert should be considered silenced
func (a Alert) IsInhibited() bool {
	return (a.State == AlertStateSuppressed && len(a.InhibitedBy) > 0)
}

// IsActive will return true if alert is not suppressed in any way
func (a Alert) IsActive() bool {
	return (a.State == AlertStateActive)
}
