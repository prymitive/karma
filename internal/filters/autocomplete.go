package filters

import (
	"github.com/prymitive/karma/internal/models"
)

type autocompleteFactory func(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete)

func setAC(dst map[string]models.Autocomplete, value string, tokens []string) {
	if _, ok := dst[value]; ok {
		return
	}
	t := make([]string, len(tokens)+1)
	copy(t, tokens)
	t[len(tokens)] = value
	dst[value] = models.Autocomplete{
		Value:  value,
		Tokens: t,
	}
}

// BuildAutocomplete takes an alert list and populates dst with autocomplete hints.
func BuildAutocomplete(alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, filterConfig := range AllFilters {
		if filterConfig.Autocomplete != nil {
			filterConfig.Autocomplete(filterConfig.Label, filterConfig.SupportedOperators, alerts, dst)
		}
	}
}
