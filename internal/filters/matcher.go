package filters

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"

	lru "github.com/hashicorp/golang-lru/v2"
)

var matchCache, _ = lru.New[string, *regexp.Regexp](1000)

type matcherT interface {
	setOperator(operator string)
	GetOperator() string
	Compare(valA, valB any) bool
}

type abstractMatcher struct {
	matcherT
	Operator string
}

func (matcher *abstractMatcher) GetOperator() string {
	return matcher.Operator
}

type equalMatcher struct {
	abstractMatcher
}

func (matcher *equalMatcher) Compare(valA, valB any) bool {
	return valA == valB
}

type notEqualMatcher struct {
	abstractMatcher
}

func (matcher *notEqualMatcher) Compare(valA, valB any) bool {
	return valA != valB
}

type moreThanMatcher struct {
	abstractMatcher
}

func (matcher *moreThanMatcher) Compare(valA, valB any) bool {
	if valA == nil || valA == "" || valB == nil || valB == "" {
		return false
	}

	if intA, ok := valA.(int); ok {
		if intB, ok := valB.(int); ok {
			return intA > intB
		}
	}

	if atoiA, err := strconv.Atoi(valA.(string)); err == nil {
		if atoiB, err := strconv.Atoi(valB.(string)); err == nil {
			return atoiA > atoiB
		}
	}

	return string(valA.(string)) > string(valB.(string))
}

type lessThanMatcher struct {
	abstractMatcher
}

func (matcher *lessThanMatcher) Compare(valA, valB any) bool {
	if valA == nil || valA == "" || valB == nil || valB == "" {
		return false
	}

	if intA, ok := valA.(int); ok {
		if intB, ok := valB.(int); ok {
			return intA < intB
		}
	}

	if atoiA, err := strconv.Atoi(valA.(string)); err == nil {
		if atoiB, err := strconv.Atoi(valB.(string)); err == nil {
			return atoiA < atoiB
		}
	}

	return string(valA.(string)) < string(valB.(string))
}

type regexpMatcher struct {
	abstractMatcher
}

func (matcher *regexpMatcher) Compare(valA, valB any) bool {
	r, found := matchCache.Get(valB.(string))
	if !found {
		var err error
		r, err = regexp.Compile("(?i)" + valB.(string))
		if err != nil {
			return false
		}
		matchCache.Add(valB.(string), r)
	}
	return r.MatchString(valA.(string))
}

type negativeRegexMatcher struct {
	abstractMatcher
}

func (matcher *negativeRegexMatcher) Compare(valA, valB any) bool {
	r := regexpMatcher{}
	return !r.Compare(valA, valB)
}

func newMatcher(matchType string) (matcherT, error) {
	if m, found := matcherConfig[matchType]; found {
		return m, nil
	}
	e := fmt.Sprintf("%s not matched with any know match type", matchType)
	return nil, errors.New(e)
}
