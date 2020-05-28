package filters

import (
	"github.com/prymitive/karma/internal/models"
)

type autocompleteFactory func(name string, operators []string, alerts []models.Alert) []models.Autocomplete

func makeAC(value string, tokens []string) models.Autocomplete {
	acHint := models.Autocomplete{
		Value:  value,
		Tokens: tokens,
	}
	acHint.Tokens = append(acHint.Tokens, value)
	return acHint
}

// BuildAutocomplete takes an alert object and generates list of autocomplete
// strings for it
func BuildAutocomplete(alerts []models.Alert) []models.Autocomplete {
	acHints := map[string]models.Autocomplete{}
	for _, filterConfig := range AllFilters {
		if filterConfig.Autocomplete != nil {
			for _, hint := range filterConfig.Autocomplete(filterConfig.Label, filterConfig.SupportedOperators, alerts) {
				acHints[hint.Value] = hint
			}
		}
	}
	acHintsSlice := make([]models.Autocomplete, 0, len(acHints))
	for _, hint := range acHints {
		acHintsSlice = append(acHintsSlice, hint)
	}
	return acHintsSlice
}
