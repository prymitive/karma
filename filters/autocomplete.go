package filters

import (
	"github.com/cloudflare/unsee/models"
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
