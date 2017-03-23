package filters

import (
	"github.com/cloudflare/unsee/models"
)

type autocompleteFactory func(name string, operators []string, alerts []models.UnseeAlert) []models.UnseeAutocomplete

func makeAC(value string, tokens []string) models.UnseeAutocomplete {
	acHint := models.UnseeAutocomplete{
		Value:  value,
		Tokens: tokens,
	}
	acHint.Tokens = append(acHint.Tokens, value)
	return acHint
}
