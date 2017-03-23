package transform

import "github.com/asaskevich/govalidator"

// DetectLinks takes alert annotation dict and returns two dicts:
// first with regular annotations
// secondd with annotations where values are URLs
func DetectLinks(sourceAnnotations map[string]string) (map[string]string, map[string]string) {
	links := make(map[string]string)
	annotations := make(map[string]string)

	for k, v := range sourceAnnotations {
		if govalidator.IsURL(v) {
			links[k] = v
		} else {
			annotations[k] = v
		}
	}

	return annotations, links
}
