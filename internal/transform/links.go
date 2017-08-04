package transform

import (
	"net/url"

	"github.com/cloudflare/unsee/internal/slices"
)

// list of URI schema which we turn into links in the UI
var schemes = []string{
	"ftp",
	"http",
	"https",
}

// DetectLinks takes alert annotation dict and returns two dicts:
// first with regular annotations
// secondd with annotations where values are URLs
func DetectLinks(sourceAnnotations map[string]string) (map[string]string, map[string]string) {
	links := make(map[string]string)
	annotations := make(map[string]string)

	for k, v := range sourceAnnotations {
		u, err := url.Parse(v)
		if err != nil {
			annotations[k] = v
		} else if slices.StringInSlice(schemes, u.Scheme) {
			links[k] = v
		} else {
			annotations[k] = v
		}
	}

	return annotations, links
}
