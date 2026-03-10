package models

import (
	"cmp"
	"io"
	"strconv"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/prometheus/prometheus/model/labels"
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
	// LatestStartsAt is the most recent StartsAt timestamp across all alerts
	// in this group, used for sorting groups by time in the API response.
	LatestStartsAt    time.Time
	AlertmanagerCount map[string]int
	StateCount        map[string]int
	Receiver          string
	ID                string
	// Hash is a content fingerprint of all alerts in this group, used by the
	// UI to detect changes and avoid unnecessary re-renders.
	Hash string
	// Labels are the grouping labels for this alert group as returned by
	// Alertmanager. They are converted to OrderedLabels in APIAlertGroup
	// for JSON serialization.
	Labels labels.Labels
	Alerts AlertList
}

// LabelsFingerprint is a checksum of this AlertGroup labels and the receiver
// it should be unique for each AlertGroup
func (ag AlertGroup) LabelsFingerprint() string {
	h := xxhash.New()
	_, _ = h.WriteString(ag.Receiver)
	_, _ = h.Write(seps)
	_, _ = h.WriteString(strconv.FormatUint(ag.Labels.Hash(), 16))
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
