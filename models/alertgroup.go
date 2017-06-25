package models

import (
	"crypto/sha1"
	"fmt"
	"io"
)

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
	Receiver   string            `json:"receiver"`
	Labels     map[string]string `json:"labels"`
	Alerts     AlertList         `json:"alerts"`
	ID         string            `json:"id"`
	Hash       string            `json:"hash"`
	StateCount map[string]int    `json:"stateCount"`
}

// ContentFingerprint is a checksum of all alerts in the group
func (ag AlertGroup) ContentFingerprint() string {
	h := sha1.New()
	for _, alert := range ag.Alerts {
		io.WriteString(h, alert.Fingerprint)
	}
	return fmt.Sprintf("%x", h.Sum(nil))
}
