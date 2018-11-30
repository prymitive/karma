package main

import (
	"sort"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"

	log "github.com/sirupsen/logrus"
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

	clusters := map[string][]string{}
	upstreams := alertmanager.GetAlertmanagers()
	for _, upstream := range upstreams {
		members := upstream.ClusterMemberNames()
		sort.Strings(members)
		key, err := slices.StringSliceToSHA1(members)
		if err != nil {
			log.Errorf("slices.StringSliceToSHA1 error: %s", err)
			continue
		}
		if _, found := clusters[key]; !found {
			clusters[key] = members
		}

		u := models.AlertmanagerAPIStatus{
			Name:           upstream.Name,
			URI:            upstream.SanitizedURI(),
			PublicURI:      upstream.PublicURI(),
			Error:          upstream.Error(),
			Version:        upstream.Version(),
			ClusterMembers: members,
		}
		summary.Instances = append(summary.Instances, u)

		summary.Counters.Total++
		if u.Error == "" {
			summary.Counters.Healthy++
		} else {
			summary.Counters.Failed++
		}
	}
	summary.Clusters = clusters

	return summary
}
