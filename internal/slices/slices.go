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
