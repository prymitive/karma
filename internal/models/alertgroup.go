package models

import (
	"crypto/sha1"
	"fmt"
	"io"
	"time"

	"github.com/cnf/structhash"
)

// AlertList is flat list of karmaAlert objects
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
	return a[i].LabelsFingerprint() < a[j].LabelsFingerprint()
}

// AlertGroup is vanilla Alertmanager group, but alerts are flattened
// There is a hash computed from all alerts, it's used by UI to quickly tell
// if there was any change in a group and it needs to refresh it
type AlertGroup struct {
	Receiver          string            `json:"receiver"`
	Labels            map[string]string `json:"labels"`
	Alerts            AlertList         `json:"alerts"`
	ID                string            `json:"id"`
	Hash              string            `json:"-"`
	AlertmanagerCount map[string]int    `json:"alertmanagerCount"`
	StateCount        map[string]int    `json:"stateCount"`
	LatestStartsAt    time.Time         `json:"-"`
}

// LabelsFingerprint is a checksum of this AlertGroup labels and the receiver
// it should be unique for each AlertGroup
func (ag AlertGroup) LabelsFingerprint() string {
	agIDHasher := sha1.New()
	_, _ = io.WriteString(agIDHasher, ag.Receiver)
	_, _ = io.WriteString(agIDHasher, fmt.Sprintf("%x", structhash.Sha1(ag.Labels, 1)))
	return fmt.Sprintf("%x", agIDHasher.Sum(nil))
}

// ContentFingerprint is a checksum of all alerts in the group
func (ag AlertGroup) ContentFingerprint() string {
	h := sha1.New()
	for _, alert := range ag.Alerts {
		_, _ = io.WriteString(h, alert.ContentFingerprint())
	}
	return fmt.Sprintf("%x", h.Sum(nil))
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
