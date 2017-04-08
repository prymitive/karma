package transform

import (
	"github.com/cloudflare/unsee/filters"
	"github.com/cloudflare/unsee/models"
)

// BuildAutocomplete takes an alert object and generates list of autocomplete
// strings for it
func BuildAutocomplete(alerts []models.Alert) []models.Autocomplete {
	acHints := map[string]models.Autocomplete{}
	for _, filterConfig := range filters.AllFilters {
		if filterConfig.Autocomplete != nil {
			for _, hint := range filterConfig.Autocomplete(filterConfig.Label, filterConfig.SupportedOperators, alerts) {
				acHints[hint.Value] = hint
			}
		}
	}
	acHintsSlice := []models.Autocomplete{}
	for _, hint := range acHints {
		acHintsSlice = append(acHintsSlice, hint)
	}
	return acHintsSlice
}
