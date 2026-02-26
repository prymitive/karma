package slices

import (
	"crypto/sha1"
	"encoding/hex"
	"regexp"
	"slices"
)

// StringSliceToSHA1 returns a SHA1 hash computed from a slice of strings
func StringSliceToSHA1(stringArray []string) (string, error) {
	h := sha1.New()
	for _, s := range stringArray {
		_, _ = h.Write([]byte(s))
		_, _ = h.Write([]byte("\n"))
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func StringSliceDiff(slice1, slice2 []string) ([]string, []string) {
	missing := []string{}
	extra := []string{}

	var found bool

	for _, s1 := range slice1 {
		found = slices.Contains(slice2, s1)
		if !found {
			missing = append(missing, s1)
		}
	}

	for _, s2 := range slice2 {
		found = slices.Contains(slice1, s2)
		if !found {
			extra = append(extra, s2)
		}
	}

	return missing, extra
}

func MatchesAnyRegex(value string, regexes []*regexp.Regexp) bool {
	for _, regex := range regexes {
		if regex.MatchString(value) {
			return true
		}
	}
	return false
}
