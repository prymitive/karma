package models

import (
	"cmp"
	"io"
	"strconv"
	"time"

	"github.com/cespare/xxhash/v2"
)

// AlertList is flat list of karmaAlert objects
type AlertList []Alert

func CompareAlerts(a, b Alert) int {
	// compare timestamps, if equal compare fingerprints to stable sort order
	if a.StartsAt.After(b.StartsAt) {
		return -1
	}
	if a.StartsAt.Before(b.StartsAt) {
		return 1
	}
	return cmp.Compare(a.LabelsFingerprint(), b.LabelsFingerprint())
}

// AlertGroup is vanilla Alertmanager group, but alerts are flattened
// There is a hash computed from all alerts, it's used by UI to quickly tell
// if there was any change in a group and it needs to refresh it
type AlertGroup struct {
	LatestStartsAt    time.Time      `json:"-"`
	AlertmanagerCount map[string]int `json:"alertmanagerCount"`
	StateCount        map[string]int `json:"stateCount"`
	Receiver          UniqueString   `json:"receiver"`
	ID                string         `json:"id"`
	Hash              string         `json:"-"`
	Labels            Labels         `json:"labels"`
	Alerts            AlertList      `json:"alerts"`
}

// LabelsFingerprint is a checksum of this AlertGroup labels and the receiver
// it should be unique for each AlertGroup
func (ag AlertGroup) LabelsFingerprint() string {
	h := xxhash.New()
	_, _ = h.WriteString(ag.Receiver.Value())
	_, _ = h.Write(seps)
	for _, l := range ag.Labels {
		_, _ = h.WriteString(l.Name.Value())
		_, _ = h.Write(seps)
		_, _ = h.WriteString(l.Value.Value())
		_, _ = h.Write(seps)
	}
	return strconv.FormatUint(h.Sum64(), 16)
}

// ContentFingerprint is a checksum of all alerts in the group
func (ag AlertGroup) ContentFingerprint() string {
	h := xxhash.New()
	for _, alert := range ag.Alerts {
		_, _ = io.WriteString(h, alert.ContentFingerprint())
	}
	return strconv.FormatUint(h.Sum64(), 16)
}

func (ag AlertGroup) FindLatestStartsAt() time.Time {
	var ts time.Time
	for i, alert := range ag.Alerts {
		if i == 0 || alert.StartsAt.After(ts) {
			ts = alert.StartsAt
		}
	}
	return ts
}
