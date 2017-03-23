package main

import (
	"strings"
	"github.com/cloudflare/unsee/filters"
	"github.com/cloudflare/unsee/models"
)

func getFiltersFromQuery(filterString string) ([]filters.FilterT, bool) {
	validFilters := false
	matchFilters := []filters.FilterT{}
	qList := strings.Split(filterString, ",")
	for _, filterExpression := range qList {
		f := filters.NewFilter(filterExpression)
		if f.GetIsValid() {
			validFilters = true
		}
		matchFilters = append(matchFilters, f)
	}
	return matchFilters, validFilters
}

func countLabel(countStore models.UnseeCountMap, key string, val string) {
	if _, found := countStore[key]; !found {
		countStore[key] = make(map[string]int)
	}
	if _, found := countStore[key][val]; found {
		countStore[key][val]++
	} else {
		countStore[key][val] = 1
	}
}
