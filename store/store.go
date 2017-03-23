package store

import (
	"sync"
	"time"
	"github.com/cloudflare/unsee/models"
)

type alertStoreType struct {
	Store     []models.UnseeAlertGroup
	Timestamp time.Time
}

type silenceStoreType struct {
	Store     map[string]models.UnseeSilence
	Timestamp time.Time
}

type colorStoreType struct {
	Store     models.UnseeColorMap
	Timestamp time.Time
}

type autocompleteStore struct {
	Store     []models.UnseeAutocomplete
	Timestamp time.Time
}

var (
	// StoreLock guards access to all variables storing internal data
	// (alerts, silences, colors, ac)
	StoreLock = sync.RWMutex{}

	// AlertStore holds all alerts retrieved from AlertManager
	AlertStore = alertStoreType{}

	// SilenceStore holds all silences retrieved from AlertManager
	SilenceStore = silenceStoreType{}

	// ColorStore holds all color maps generated from alerts
	ColorStore = colorStoreType{}

	// AutocompleteStore holds all autocomplete data generated from alerts
	AutocompleteStore = autocompleteStore{}
)
