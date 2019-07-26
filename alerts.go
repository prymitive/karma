package main

import (
	"fmt"
	"math"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
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

func countLabel(countStore map[string]map[string]int, key string, val string) {
	if _, found := countStore[key]; !found {
		countStore[key] = make(map[string]int)
	}
	if _, found := countStore[key][val]; found {
		countStore[key][val]++
	} else {
		countStore[key][val] = 1
	}
}

func countersToLabelStats(counters map[string]map[string]int) models.LabelNameStatsList {
	data := models.LabelNameStatsList{}

	for name, valueMap := range counters {
		nameStats := models.LabelNameStats{
			Name:   name,
			Values: models.LabelValueStatsList{},
		}

		for value, hits := range valueMap {
			nameStats.Hits += hits
			valueStats := models.LabelValueStats{
				Value: value,
				Raw:   fmt.Sprintf("%s=%s", name, value),
				Hits:  hits,
			}
			nameStats.Values = append(nameStats.Values, valueStats)
		}

		// now that we have total hits we can calculate %
		var totalPercent int
		for i, value := range nameStats.Values {
			nameStats.Values[i].Percent = int(math.Round((float64(value.Hits) / float64(nameStats.Hits)) * 100.0))
			totalPercent += nameStats.Values[i].Percent
		}
		sort.Sort(nameStats.Values)
		for totalPercent < 100 {
			for i := range nameStats.Values {
				nameStats.Values[i].Percent++
				totalPercent++
				if totalPercent >= 100 {
					break
				}
			}
		}

		// now that we have all % and values are sorted we can calculate offsets
		offset := 0
		for i, value := range nameStats.Values {
			nameStats.Values[i].Offset = offset
			offset += value.Percent
		}
		data = append(data, nameStats)
	}

	sort.Sort(data)

	return data
}

func getUpstreams() models.AlertmanagerAPISummary {
	summary := models.AlertmanagerAPISummary{}

	clusters := map[string][]string{}
	upstreams := alertmanager.GetAlertmanagers()
	for _, upstream := range upstreams {
		members := upstream.ClusterMemberNames()
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
			Cluster:        upstream.ClusterID(),
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

func resolveLabelValue(name, value string) (int, bool) {
	valueReplacements, found := config.Config.Grid.Sorting.CustomValues.Labels[name]
	if found {
		if replacement, ok := valueReplacements[value]; ok {
			return replacement, true
		}
	}
	return value, false
}

func getGroupLabel(group *models.APIAlertGroup, label string) int {
	if v, found := group.Labels[label]; found {
		return resolveLabelValue(label, v)
	}
	if v, found := group.Shared.Labels[label]; found {
		return resolveLabelValue(label, v)
	}
	if v, found := group.Alerts[0].Labels[label]; found {
		return resolveLabelValue(label, v)
	}
	return 0
}

func sortAlertGroups(c *gin.Context, groupsMap map[string]models.APIAlertGroup) []models.APIAlertGroup {
	groups := make([]models.APIAlertGroup, 0, len(groupsMap))

	sortOrder, found := c.GetQuery("sortOrder")
	if !found {
		sortOrder = config.Config.Grid.Sorting.Order
	}

	sortReverse, found := c.GetQuery("sortReverse")
	if !found {
		if config.Config.Grid.Sorting.Reverse {
			sortReverse = "1"
		} else {
			sortReverse = "0"
		}
	}

	sortLabel, found := c.GetQuery("sortLabel")
	if !found {
		sortLabel = config.Config.Grid.Sorting.Label
	}

	for _, g := range groupsMap {
		groups = append(groups, g)
	}

	switch sortOrder {
	case "startsAt":
		sort.SliceStable(groups, func(i, j int) bool {
			return groups[i].LatestStartsAt.After(groups[j].LatestStartsAt)
		})
	case "label":
		sort.SliceStable(groups, func(i, j int) bool {
			return getGroupLabel(&groups[i], sortLabel) < getGroupLabel(&groups[j], sortLabel)
		})
	default:
		// sort alert groups so they are always returned in the same order
		// use group ID which is unique and immutable
		sort.SliceStable(groups, func(i, j int) bool {
			return groups[i].ID < groups[j].ID
		})
	}

	if sortReverse == "1" {
		sort.Reverse(groups)
	}

	return groups

	//
}
