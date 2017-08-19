package models

import (
	"net/url"
	"sort"

	"github.com/cloudflare/unsee/internal/slices"
)

// Annotation extends Alertmanager scheme of key:value with additional data
// to control how given annotation should be rendered
type Annotation struct {
	Name    string `json:"name"`
	Value   string `json:"value"`
	Visible bool   `json:"visible"`
	IsLink  bool   `json:"isLink"`
}

// Annotations is a slice of Annotation structs, needed to implement sorting
type Annotations []Annotation

func (a Annotations) Len() int {
	return len(a)

}
func (a Annotations) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}
func (a Annotations) Less(i, j int) bool {
	return a[i].Name < a[j].Name
}

// AnnotationsFromMap will convert a map[string]string to a list of Annotation
// instances, it takes care of setting proper value for Visible attribute
func AnnotationsFromMap(m map[string]string) Annotations {
	annotations := Annotations{}
	for key, value := range m {
		a := Annotation{
			Name:    key,
			Value:   value,
			Visible: true, // FIXME needs implementing
			IsLink:  isLink(value),
		}
		annotations = append(annotations, a)
	}
	sort.Sort(annotations)
	return annotations
}

var linkSchemes = []string{
	"ftp",
	"http",
	"https",
}

func isLink(s string) bool {
	u, err := url.Parse(s)
	if err != nil {
		return false
	}
	if slices.StringInSlice(linkSchemes, u.Scheme) {
		// parses with url.Parse and scheme is in the list of supported schemes
		return true
	}
	return false
}
