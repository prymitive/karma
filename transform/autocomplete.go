package transform

import (
	"github.com/cloudflare/unsee/filters"
	"github.com/cloudflare/unsee/models"
)

// BuildAutocomplete takes an alert object and generates list of autocomplete
// strings for it
func BuildAutocomplete(alerts []models.UnseeAlert) []models.UnseeAutocomplete {
	acHints := map[string]models.UnseeAutocomplete{}
	for _, filterConfig := range filters.AllFilters {
		if filterConfig.Autocomplete != nil {
			for _, hint := range filterConfig.Autocomplete(filterConfig.Label, filterConfig.SupportedOperators, alerts) {
				acHints[hint.Value] = hint
			}
		}
	}
	acHintsSlice := []models.UnseeAutocomplete{}
	for _, hint := range acHints {
		acHintsSlice = append(acHintsSlice, hint)
	}
	return acHintsSlice
}
