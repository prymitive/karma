package alertmanager

import (
	"sort"

	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/slices"
)

// DedupAlerts will collect alert groups from all defined Alertmanager
// upstreams and deduplicate them, so we only return unique alerts
func DedupAlerts() []models.AlertGroup {
	uniqueGroups := map[string][]models.AlertGroup{}

	upstreams := GetAlertmanagers()
	for _, am := range upstreams {
		groups := am.Alerts()
		for _, ag := range groups {
			if _, found := uniqueGroups[ag.ID]; !found {
				uniqueGroups[ag.ID] = []models.AlertGroup{}
			}
			uniqueGroups[ag.ID] = append(uniqueGroups[ag.ID], ag)
		}
	}

	dedupedGroups := []models.AlertGroup{}
	for _, agList := range uniqueGroups {
		alerts := map[string]models.Alert{}
		for _, ag := range agList {
			for _, alert := range ag.Alerts {
				alertLFP := alert.LabelsFingerprint()
				a, found := alerts[alertLFP]
				if found {
					for _, am := range alert.Alertmanager {
						a.Alertmanager = append(a.Alertmanager, am)
						alerts[alertLFP] = a
					}
				} else {
					alerts[alertLFP] = alert
				}
			}
		}
		ag := models.AlertGroup(agList[0])
		ag.Alerts = models.AlertList{}
		for _, alert := range alerts {
			ag.Alerts = append(ag.Alerts, alert)
		}
		sort.Sort(ag.Alerts)
		ag.Hash = ag.ContentFingerprint()
		dedupedGroups = append(dedupedGroups, ag)
	}

	return dedupedGroups
}

// DedupColors returns a color map merged from all Alertmanager upstream color
// maps
func DedupColors() models.LabelsColorMap {
	dedupedColors := models.LabelsColorMap{}

	upstreams := GetAlertmanagers()

	for _, am := range upstreams {
		colors := am.Colors()
		// map[string]map[string]LabelColors
		for labelName, valueMap := range colors {
			if _, found := dedupedColors[labelName]; !found {
				dedupedColors[labelName] = map[string]models.LabelColors{}
			}
			for labelVal, labelColors := range valueMap {
				if _, found := dedupedColors[labelName][labelVal]; !found {
					dedupedColors[labelName][labelVal] = labelColors
				}
			}
		}
	}

	return dedupedColors
}

// DedupAutocomplete returns a list of autocomplete hints merged from all
// Alertmanager upstreams
func DedupAutocomplete() []models.Autocomplete {
	dedupedAutocomplete := []models.Autocomplete{}
	uniqueAutocomplete := map[string]*models.Autocomplete{}

	upstreams := GetAlertmanagers()

	for _, am := range upstreams {
		ac := am.Autocomplete()
		for _, hint := range ac {
			h, found := uniqueAutocomplete[hint.Value]
			if found {
				for _, token := range hint.Tokens {
					if !slices.StringInSlice(h.Tokens, token) {
						h.Tokens = append(h.Tokens, token)
					}
				}
			} else {
				uniqueAutocomplete[hint.Value] = &models.Autocomplete{
					Value:  hint.Value,
					Tokens: hint.Tokens,
				}
			}
		}
	}

	for _, hint := range uniqueAutocomplete {
		dedupedAutocomplete = append(dedupedAutocomplete, *hint)
	}

	return dedupedAutocomplete
}
