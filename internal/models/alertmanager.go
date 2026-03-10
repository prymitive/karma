package models

import (
	"time"

	"github.com/go-json-experiment/json/jsontext"
)

// AlertmanagerInstance describes the Alertmanager instance alert was collected
// from
type AlertmanagerInstance struct {
	// timestamp collected from this instance, those on the alert itself
	// will be calculated min/max values
	StartsAt time.Time `json:"startsAt"`
	// all silences matching current alert in this upstream, we don't export this
	// in api responses, this is used internally
	Silences    map[string]*Silence `json:"-"`
	Fingerprint string              `json:"fingerprint"`
	Name        string              `json:"name"`
	Cluster     string              `json:"cluster"`
	// Source links to alert source for given alertmanager instance
	Source string `json:"source"`
	// export list of silenced IDs in api response
	SilencedBy  []string `json:"silencedBy"`
	InhibitedBy []string `json:"inhibitedBy"`
	// per instance alert state
	State AlertState `json:"state"`
}

func (am AlertmanagerInstance) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	am.marshalTo(&w)
	return w.err
}

func (am *AlertmanagerInstance) marshalTo(w *jsonWriter) {
	w.beginObject()
	w.key("startsAt")
	w.time(am.StartsAt)
	w.key("fingerprint")
	w.str(am.Fingerprint)
	w.key("name")
	w.str(am.Name)
	w.key("cluster")
	w.str(am.Cluster)
	w.key("source")
	w.str(am.Source)
	w.key("silencedBy")
	w.strings(am.SilencedBy)
	w.key("inhibitedBy")
	w.strings(am.InhibitedBy)
	w.key("state")
	w.str(am.State.String())
	w.endObject()
}

// AlertmanagerAPIStatus describes the Alertmanager instance overall health
type AlertmanagerAPIStatus struct {
	Headers         map[string]string `json:"headers"`
	Name            string            `json:"name"`
	URI             string            `json:"uri"`
	PublicURI       string            `json:"publicURI"`
	CORSCredentials string            `json:"corsCredentials"`
	Error           string            `json:"error"`
	Version         string            `json:"version"`
	Cluster         string            `json:"cluster"`
	ClusterMembers  []string          `json:"clusterMembers"`
	ReadOnly        bool              `json:"readonly"`
}

func (s AlertmanagerAPIStatus) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	s.marshalTo(&w)
	return w.err
}

func (s *AlertmanagerAPIStatus) marshalTo(w *jsonWriter) {
	w.beginObject()
	w.key("headers")
	w.mapStringString(s.Headers)
	w.key("name")
	w.str(s.Name)
	w.key("uri")
	w.str(s.URI)
	w.key("publicURI")
	w.str(s.PublicURI)
	w.key("corsCredentials")
	w.str(s.CORSCredentials)
	w.key("error")
	w.str(s.Error)
	w.key("version")
	w.str(s.Version)
	w.key("cluster")
	w.str(s.Cluster)
	w.key("clusterMembers")
	w.strings(s.ClusterMembers)
	w.key("readonly")
	w.boolean(s.ReadOnly)
	w.endObject()
}

// AlertmanagerAPICounters returns number of Alertmanager instances in each
// state
type AlertmanagerAPICounters struct {
	Total   int `json:"total"`
	Healthy int `json:"healthy"`
	Failed  int `json:"failed"`
}

func (c AlertmanagerAPICounters) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("total")
	w.integer(c.Total)
	w.key("healthy")
	w.integer(c.Healthy)
	w.key("failed")
	w.integer(c.Failed)
	w.endObject()
	return w.err
}

// AlertmanagerAPISummary describes the Alertmanager instance overall health
type AlertmanagerAPISummary struct {
	Clusters  map[string][]string     `json:"clusters"`
	Instances []AlertmanagerAPIStatus `json:"instances"`
	Counters  AlertmanagerAPICounters `json:"counters"`
}

func (s AlertmanagerAPISummary) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("clusters")
	w.mapStringStringSlice(s.Clusters)
	w.key("instances")
	w.beginArray()
	for i := range s.Instances {
		s.Instances[i].marshalTo(&w)
	}
	w.endArray()
	w.key("counters")
	w.beginObject()
	w.key("total")
	w.integer(s.Counters.Total)
	w.key("healthy")
	w.integer(s.Counters.Healthy)
	w.key("failed")
	w.integer(s.Counters.Failed)
	w.endObject()
	w.endObject()
	return w.err
}
