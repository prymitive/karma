package filters

type alwaysInvalidFilter struct {
	alertFilter
}

func (filter *alwaysInvalidFilter) init(name string, _ *matcherT, rawText string, _ bool, _ string) {
	filter.Matched = name
	filter.RawText = rawText
}
