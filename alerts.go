package main

import (
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
)

func getFiltersFromQuery(filterStrings []string) ([]filters.FilterT, bool) {
	validFilters := false
	matchFilters := []filters.FilterT{}
	for _, filterExpression := range filterStrings {
		f := filters.NewFilter(filterExpression)
		if f.GetIsValid() {
			validFilters = true
		}
		matchFilters = append(matchFilters, f)
	}
	return matchFilters, validFilters
}

func countLabel(countStore models.LabelsCountMap, key string, val string) {
	if _, found := countStore[key]; !found {
		countStore[key] = make(map[string]int)
	}
	if _, found := countStore[key][val]; found {
		countStore[key][val]++
	} else {
		countStore[key][val] = 1
	}
}

func getUpstreams() models.AlertmanagerAPISummary {
	summary := models.AlertmanagerAPISummary{}

	upstreams := alertmanager.GetAlertmanagers()
	for _, upstream := range upstreams {
		u := models.AlertmanagerAPIStatus{
			Name:           upstream.Name,
			URI:            upstream.SanitizedURI(),
			PublicURI:      upstream.PublicURI(),
			Error:          upstream.Error(),
			Version:        upstream.Version(),
			ClusterMembers: upstream.ClusterMemberNames(),
		}
		summary.Instances = append(summary.Instances, u)

		summary.Counters.Total++
		if u.Error == "" {
			summary.Counters.Healthy++
		} else {
			summary.Counters.Failed++
		}
	}

	return summary
}
