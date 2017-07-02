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
	alertStates := map[string][]string{}
	for _, agList := range uniqueGroups {
		alerts := map[string]models.Alert{}
		for _, ag := range agList {
			for _, alert := range ag.Alerts {
				alertLFP := alert.LabelsFingerprint()
				a, found := alerts[alertLFP]
				if found {
					// if we already have an alert with the same fp then just append
					// alertmanager instances to it, this way we end up with all instances
					// for each unique alert merged into a single alert with all
					// alertmanager instances attached to it
					for _, am := range alert.Alertmanager {
						a.Alertmanager = append(a.Alertmanager, am)
					}
					// set startsAt to the earliest value we have
					if alert.StartsAt.Before(a.StartsAt) {
						a.StartsAt = alert.StartsAt
					}
					// set endsAt to the oldest value we have
					if alert.EndsAt.After(a.EndsAt) {
						a.EndsAt = alert.EndsAt
					}
					// update map
					alerts[alertLFP] = a
					// and append alert state to the slice
					alertStates[alertLFP] = append(alertStates[alertLFP], alert.State)
				} else {
					alerts[alertLFP] = models.Alert(alert)
					// seed alert state slice
					alertStates[alertLFP] = []string{alert.State}
				}
			}
		}
		ag := models.AlertGroup(agList[0])
		ag.Alerts = models.AlertList{}
		for _, alert := range alerts {
			// calculate final alert state based on the most important value found
			// in the list of states from all instances
			alertLFP := alert.LabelsFingerprint()
			if slices.StringInSlice(alertStates[alertLFP], models.AlertStateActive) {
				alert.State = models.AlertStateActive
			} else if slices.StringInSlice(alertStates[alertLFP], models.AlertStateSuppressed) {
				alert.State = models.AlertStateSuppressed
			} else {
				alert.State = models.AlertStateUnprocessed
			}
			// sort Alertmanager instances for every alert
			sort.Slice(alert.Alertmanager, func(i, j int) bool {
				return alert.Alertmanager[i].Name < alert.Alertmanager[j].Name
			})
			ag.Alerts = append(ag.Alerts, alert)
		}
		sort.Sort(ag.Alerts)
		ag.Hash = ag.ContentFingerprint()
		dedupedGroups = append(dedupedGroups, ag)
	}

	// sort alert groups so they are always returned in the same order
	// use group ID which is unique and immutable
	sort.Slice(dedupedGroups, func(i, j int) bool {
		return dedupedGroups[i].ID < dedupedGroups[j].ID
	})

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
