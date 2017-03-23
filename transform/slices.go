package transform

func stringInSlice(stringArray []string, value string) bool {
	for _, s := range stringArray {
		if s == value {
			return true
		}
	}
	return false
}
