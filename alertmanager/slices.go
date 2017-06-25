package alertmanager

func boolInSlice(boolArray []bool, value bool) bool {
	for _, s := range boolArray {
		if s == value {
			return true
		}
	}
	return false
}

func stringInSlice(stringArray []string, value string) bool {
	for _, s := range stringArray {
		if s == value {
			return true
		}
	}
	return false
}
