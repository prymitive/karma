package models

import "time"

// AlertmanagerInstance describes the Alertmanager instance alert was collected
// from
type AlertmanagerInstance struct {
	Fingerprint string `json:"fingerprint"`
	Name        string `json:"name"`
	Cluster     string `json:"cluster"`
	// per instance alert state
	State string `json:"state"`
	// timestamp collected from this instance, those on the alert itself
	// will be calculated min/max values
	StartsAt time.Time `json:"startsAt"`
	// Source links to alert source for given alertmanager instance
	Source string `json:"source"`
	// all silences matching current alert in this upstream, we don't export this
	// in api responses, this is used internally
	Silences map[string]*Silence `json:"-"`
	// export list of silenced IDs in api response
	SilencedBy  []string `json:"silencedBy"`
	InhibitedBy []string `json:"inhibitedBy"`
}

// AlertmanagerAPIStatus describes the Alertmanager instance overall health
type AlertmanagerAPIStatus struct {
	Name string `json:"name"`
	// this is the Alertmanager URI used for all requests made by the UI
	URI string `json:"uri"`
	// this is the Alertmanager URI used for links in the browser
	PublicURI       string            `json:"publicURI"`
	ReadOnly        bool              `json:"readonly"`
	Headers         map[string]string `json:"headers"`
	CORSCredentials string            `json:"corsCredentials"`
	Error           string            `json:"error"`
	Version         string            `json:"version"`
	Cluster         string            `json:"cluster"`
	ClusterMembers  []string          `json:"clusterMembers"`
}

// AlertmanagerAPICounters returns number of Alertmanager instances in each
// state
type AlertmanagerAPICounters struct {
	Total   int `json:"total"`
	Healthy int `json:"healthy"`
	Failed  int `json:"failed"`
}

// AlertmanagerAPISummary describes the Alertmanager instance overall health
type AlertmanagerAPISummary struct {
	Counters  AlertmanagerAPICounters `json:"counters"`
	Instances []AlertmanagerAPIStatus `json:"instances"`
	Clusters  map[string][]string     `json:"clusters"`
}
