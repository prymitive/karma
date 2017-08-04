package slices

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
