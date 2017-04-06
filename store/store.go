package store

import (
	"sync"

	"github.com/cloudflare/unsee/models"
)

type dataStore struct {
	Lock         sync.RWMutex
	Alerts       []models.AlertGroup
	Silences     map[string]models.Silence
	Colors       models.LabelsColorMap
	Autocomplete []models.Autocomplete
}

// Store will keep all Alertmanager data we collect
var Store = dataStore{}

// GetSilence returns silence data for specific silence id or nil if not found
func (ds *dataStore) GetSilence(s string) *models.Silence {
	ds.Lock.RLock()
	defer ds.Lock.RUnlock()
	if silence, found := ds.Silences[s]; found {
		return &silence
	}
	return nil
}

// SetSilences allows to update silence list stored internally
func (ds *dataStore) SetSilences(s map[string]models.Silence) {
	ds.Lock.Lock()
	defer ds.Lock.Unlock()
	ds.Silences = s
}

// Update will lock the store and update internal data
func (ds *dataStore) Update(alerts []models.AlertGroup, colors models.LabelsColorMap, autocomplete []models.Autocomplete) {
	ds.Lock.Lock()
	defer ds.Lock.Unlock()
	ds.Alerts = alerts
	ds.Colors = colors
	ds.Autocomplete = autocomplete
}
