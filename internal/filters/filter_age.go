package filters

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/models"
)

type ageFilter struct {
	filterBase
	duration time.Duration
}

func (filter *ageFilter) Value() string {
	return fmt.Sprintf("%v", filter.duration)
}

func (filter *ageFilter) Match(alert *models.Alert, _ int) bool {
	ts := time.Now().Add(filter.duration)
	isMatch := filter.matcher.Compare(strconv.Itoa(int(ts.Unix())), strconv.Itoa(int(alert.StartsAt.Unix())))
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *ageFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	ts := time.Now().Add(filter.duration)
	return filter.matcher.Compare(strconv.Itoa(int(ts.Unix())), strconv.Itoa(int(am.StartsAt.Unix())))
}

func newAgeFilter(name, operator, rawText, value string) Filter {
	dur, err := time.ParseDuration(value)
	if err != nil {
		return &filterBase{rawText: rawText}
	}
	if dur > 0 {
		dur = -dur
	}
	// operator is pre-validated by the registry, buildMatcher cannot fail here
	m, _ := buildMatcher(operator, value)
	return &ageFilter{
		filterBase: filterBase{
			matcher:              m,
			name:                 name,
			rawText:              rawText,
			value:                value,
			isValid:              true,
			isAlertmanagerFilter: true,
		},
		duration: dur,
	}
}

func ageAutocomplete(name string, operators []string, _ []models.Alert, dst map[string]models.Autocomplete) {
	for _, operator := range operators {
		setAC(dst, name+operator+"10m", []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + operator,
		})
		setAC(dst, name+operator+"1h", []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + operator,
		})
	}
}
