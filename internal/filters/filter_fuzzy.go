package filters

import (
	"fmt"
	"regexp"

	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/models"
)

type fuzzyFilter struct {
	re *regexp.Regexp
	filterBase
}

func (filter *fuzzyFilter) Value() string {
	return fmt.Sprintf("%v", filter.re)
}

func (filter *fuzzyFilter) Match(alert *models.Alert, _ int) bool {
	for _, val := range alert.Annotations {
		if filter.re.MatchString(val.Value) {
			filter.hits++
			return true
		}
	}

	var labelMatch bool
	alert.Labels.Range(func(l labels.Label) {
		if filter.re.MatchString(l.Value) {
			labelMatch = true
		}
	})
	if labelMatch {
		filter.hits++
		return true
	}

	for _, silenceID := range alert.SilencedBy {
		for _, am := range alert.Alertmanager {
			silence, found := am.Silences[silenceID]
			if found {
				if filter.re.MatchString(silence.Comment) {
					filter.hits++
					return true
				}
			}
		}
	}

	return false
}

func newFuzzyFilter(rawText string) Filter {
	re, err := regexp.Compile("(?i)" + rawText)
	if err != nil {
		return &filterBase{rawText: rawText}
	}
	return &fuzzyFilter{
		filterBase: filterBase{
			matcher: Matcher{Operator: regexpOperator},
			rawText: rawText,
			isValid: true,
		},
		re: re,
	}
}
