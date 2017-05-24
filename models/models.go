package models

import "time"

// Silence is vanilla silence + some additional attributes
// Unsee adds JIRA support, it can extract JIRA IDs from comments
// extracted ID is used to generate link to JIRA issue
// this means Unsee needs to store additional fields for each silence
type Silence struct {
	ID       string `json:"id"`
	Matchers []struct {
		Name    string `json:"name"`
		Value   string `json:"value"`
		IsRegex bool   `json:"isRegex"`
	} `json:"matchers"`
	StartsAt  time.Time `json:"startsAt"`
	EndsAt    time.Time `json:"endsAt"`
	CreatedAt time.Time `json:"createdAt"`
	CreatedBy string    `json:"createdBy"`
	Comment   string    `json:"comment"`
	// unsee fields
	JiraID  string `json:"jiraID"`
	JiraURL string `json:"jiraURL"`
}

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
	Links       map[string]string `json:"links"`
	Fingerprint string            `json:"-"`
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

// AlertList is flat list of UnseeAlert objects
type AlertList []Alert

func (a AlertList) Len() int {
	return len(a)

}
func (a AlertList) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}
func (a AlertList) Less(i, j int) bool {
	// compare timestamps, if equal compare fingerprints to stable sort order
	if a[i].StartsAt.After(a[j].StartsAt) {
		return true
	}
	if a[i].StartsAt.Before(a[j].StartsAt) {
		return false
	}
	return a[i].Fingerprint < a[j].Fingerprint
}

// AlertGroup is vanilla Alertmanager group, but alerts are flattened
// There is a hash computed from all alerts, it's used by UI to quickly tell
// if there was any change in a group and it needs to refresh it
type AlertGroup struct {
	Labels     map[string]string `json:"labels"`
	Alerts     AlertList         `json:"alerts"`
	ID         string            `json:"id"`
	Hash       string            `json:"hash"`
	StateCount map[string]int    `json:"stateCount"`
}

// Filter holds returned data on any filter passed by the user as part of the query
type Filter struct {
	Text    string `json:"text"`
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

// AlertsResponse is the structure of JSON response UI will use to get alert data
type AlertsResponse struct {
	Status      string             `json:"status"`
	Error       string             `json:"error,omitempty"`
	Timestamp   string             `json:"timestamp"`
	Version     string             `json:"version"`
	AlertGroups []AlertGroup       `json:"groups"`
	Silences    map[string]Silence `json:"silences"`
	Colors      LabelsColorMap     `json:"colors"`
	Filters     []Filter           `json:"filters"`
	Counters    LabelsCountMap     `json:"counters"`
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal represenation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}
