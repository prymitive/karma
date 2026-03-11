package filters

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type limitFilter struct {
	filterBase
	limit int
}

func (filter *limitFilter) Value() string {
	return strconv.Itoa(filter.limit)
}

func (filter *limitFilter) Match(_ *models.Alert, matches int) bool {
	if matches < filter.limit {
		return true
	}
	filter.hits++
	return false
}

func newLimitFilter(name, operator, rawText, value string) Filter {
	val, err := strconv.Atoi(value)
	if err != nil || val < 1 {
		return &filterBase{rawText: rawText}
	}
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &limitFilter{
		filterBase: filterBase{
			matcher: m,
			name:    name,
			rawText: rawText,
			value:   value,
			isValid: true,
		},
		limit: val,
	}
}

func limitAutocomplete(name string, operators []string, _ []models.Alert, dst map[string]models.Autocomplete) {
	for _, operator := range operators {
		setAC(dst, fmt.Sprintf("%s%s10", name, operator), []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + operator,
		})
		setAC(dst, fmt.Sprintf("%s%s50", name, operator), []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + operator,
		})
	}
}
