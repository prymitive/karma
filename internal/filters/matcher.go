package filters

import (
	"errors"
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

	intA, okA := castToInt(valA)
	intB, okB := castToInt(valB)

	if okA && okB {
		return intA > intB
	}

	return castToString(valA) > castToString(valB)
}

type lessThanMatcher struct {
	abstractMatcher
}

func (matcher *lessThanMatcher) Compare(valA, valB any) bool {
	if valA == nil || valA == "" || valB == nil || valB == "" {
		return false
	}

	intA, okA := castToInt(valA)
	intB, okB := castToInt(valB)

	if okA && okB {
		return intA < intB
	}

	return castToString(valA) < castToString(valB)
}

type regexpMatcher struct {
	abstractMatcher
}

func (matcher *regexpMatcher) Compare(valA, valB any) bool {
	var (
		re  *regexp.Regexp
		err error
		ok  bool
	)
	switch v := valB.(type) {
	case *regexp.Regexp:
		re = v
	case string:
		re, ok = matchCache.Get(v)
		if !ok {
			if re, err = regexp.Compile("(?i)" + v); err != nil {
				return false
			}
			matchCache.Add(v, re)
		}
	}
	return re.MatchString(castToString(valA))
}

type negativeRegexMatcher struct {
	abstractMatcher
}

func (matcher *negativeRegexMatcher) Compare(valA, valB any) bool {
	var (
		re  *regexp.Regexp
		err error
		ok  bool
	)
	switch v := valB.(type) {
	case *regexp.Regexp:
		re = v
	case string:
		re, ok = matchCache.Get(v)
		if !ok {
			if re, err = regexp.Compile("(?i)" + v); err != nil {
				return false
			}
			matchCache.Add(v, re)
		}
	}
	return !re.MatchString(castToString(valA))
}

func newMatcher(matchType string) (matcherT, error) {
	if m, found := matcherConfig[matchType]; found {
		return m, nil
	}
	e := matchType + " not matched with any know match type"
	return nil, errors.New(e)
}

func castToInt(val any) (int, bool) {
	switch v := val.(type) {
	case int:
		return v, true
	case string:
		if atoiA, err := strconv.Atoi(v); err == nil {
			return atoiA, true
		}
	}
	return 0, false
}

func castToString(val any) string {
	switch v := val.(type) {
	case string:
		return v
	default:
		return val.(string)
	}
}
