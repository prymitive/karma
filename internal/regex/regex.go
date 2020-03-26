package regex

import (
	"regexp"
	"strings"
)

func wrapRegex(r string) string {
	var prefix, suffix string
	if !strings.HasPrefix(r, "^") {
		prefix = "^"
	}
	if !strings.HasSuffix(r, "$") {
		suffix = "$"
	}
	return prefix + r + suffix
}

func MustCompileAnchored(r string) *regexp.Regexp {

	return regexp.MustCompile(wrapRegex(r))
}

func CompileAnchored(r string) (*regexp.Regexp, error) {
	return regexp.Compile(wrapRegex(r))
}
