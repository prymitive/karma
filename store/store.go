package store

import (
	"sync"

	"github.com/cloudflare/unsee/models"
)

type dataStore struct {
	Lock         sync.RWMutex
	Alerts       []models.UnseeAlertGroup
	Silences     map[string]models.UnseeSilence
	Colors       models.UnseeColorMap
	Autocomplete []models.UnseeAutocomplete
}

// Store will keep all Alertmanager data we collect
var Store = dataStore{}

// GetSilence returns silence data for specific silence id or nil if not found
func (ds *dataStore) GetSilence(s string) *models.UnseeSilence {
	ds.Lock.RLock()
	defer ds.Lock.RUnlock()
	if silence, found := ds.Silences[s]; found {
		return &silence
	}
	return nil
}

// SetSilences allows to update silence list stored internally
func (ds *dataStore) SetSilences(s map[string]models.UnseeSilence) {
	ds.Lock.Lock()
	defer ds.Lock.Unlock()
	ds.Silences = s
}

// Update will lock the store and update internal data
func (ds *dataStore) Update(alerts []models.UnseeAlertGroup, colors models.UnseeColorMap, autocomplete []models.UnseeAutocomplete) {
	ds.Lock.Lock()
	defer ds.Lock.Unlock()
	ds.Alerts = alerts
	ds.Colors = colors
	ds.Autocomplete = autocomplete
}
