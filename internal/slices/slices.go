package slices

import (
	"crypto/sha1"
	"fmt"
)

// BoolInSlice returns true if given bool is found in a slice of bools
func BoolInSlice(boolArray []bool, value bool) bool {
	for _, s := range boolArray {
		if s == value {
			return true
		}
	}
	return false
}

// StringInSlice returns true if given string is found in a slice of strings
func StringInSlice(stringArray []string, value string) bool {
	for _, s := range stringArray {
		if s == value {
			return true
		}
	}
	return false
}

// StringSliceToSHA1 returns a SHA1 hash computed from a slice of strings
func StringSliceToSHA1(stringArray []string) (string, error) {
	h := sha1.New()
	for _, s := range stringArray {
		_, _ = h.Write([]byte(s))
		_, _ = h.Write([]byte("\n"))
	}
	return fmt.Sprintf("%x", h.Sum(nil)), nil
}

func StringSliceDiff(slice1 []string, slice2 []string) ([]string, []string) {
	missing := []string{}
	extra := []string{}

	var found bool

	for _, s1 := range slice1 {
		found = false
		for _, s2 := range slice2 {
			if s1 == s2 {
				found = true
				break
			}
		}
		if !found {
			missing = append(missing, s1)
		}
	}

	for _, s2 := range slice2 {
		found = false
		for _, s1 := range slice1 {
			if s2 == s1 {
				found = true
				break
			}
		}
		if !found {
			extra = append(extra, s2)
		}
	}

	return missing, extra
}
