package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceTicketFilter struct {
	filterBase
}

func (filter *silenceTicketFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		for _, silenceID := range am.SilencedBy {
			silence, found := am.Silences[silenceID]
			if found {
				if filter.matcher.Compare(silence.TicketID, filter.value) {
					isMatch = true
				}
			}
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *silenceTicketFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	for _, silenceID := range am.SilencedBy {
		silence, found := am.Silences[silenceID]
		if found {
			if filter.matcher.Compare(silence.TicketID, filter.value) {
				return true
			}
		}
	}
	return false
}

func newSilenceTicketFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &silenceTicketFilter{
		filterBase: filterBase{
			matcher:              m,
			name:                 name,
			rawText:              rawText,
			value:                value,
			isValid:              true,
			isAlertmanagerFilter: true,
		},
	}
}

func silenceTicketIDAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				for _, am := range alert.Alertmanager {
					silence, found := am.Silences[silenceID]
					if found && silence.TicketID != "" {
						for _, operator := range operators {
							token := name + operator + silence.TicketID
							setAC(dst, token, []string{
								name,
								strings.TrimPrefix(name, "@"),
								name + operator,
								silence.TicketID,
							})
						}
					}
				}
			}
		}
	}
}
