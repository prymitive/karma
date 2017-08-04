package filters

type alwaysInvalidFilter struct {
	alertFilter
}

func (filter *alwaysInvalidFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	filter.RawText = rawText
}
