package slices

import (
	"crypto/sha1"
	"encoding/hex"
	"regexp"
)

// StringSliceToSHA1 returns a SHA1 hash computed from a slice of strings
func StringSliceToSHA1(stringArray []string) string {
	h := sha1.New()
	for _, s := range stringArray {
		_, _ = h.Write([]byte(s))
		_, _ = h.Write([]byte("\n"))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func StringSliceDiff(slice1, slice2 []string) ([]string, []string) {
	missing := []string{}
	extra := []string{}

	set1 := make(map[string]struct{}, len(slice1))
	for _, s := range slice1 {
		set1[s] = struct{}{}
	}

	set2 := make(map[string]struct{}, len(slice2))
	for _, s := range slice2 {
		set2[s] = struct{}{}
	}

	for _, s := range slice1 {
		if _, ok := set2[s]; !ok {
			missing = append(missing, s)
		}
	}

	for _, s := range slice2 {
		if _, ok := set1[s]; !ok {
			extra = append(extra, s)
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
