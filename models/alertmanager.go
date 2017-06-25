package models

// AlertmanagerUpstream describes the Alertmanager instance alert was collected
// from
type AlertmanagerUpstream struct {
	Name string `json:"name"`
	URI  string `json:"uri"`
	// all silences matching current alert in this upstream
	Silences map[string]Silence `json:"silences"`
}
