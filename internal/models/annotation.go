package models

import (
	"net/url"
	"sort"
	"strings"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/slices"
)

// Annotation extends Alertmanager scheme of key:value with additional data
// to control how given annotation should be rendered
type Annotation struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Visible  bool   `json:"visible"`
	IsLink   bool   `json:"isLink"`
	IsAction bool   `json:"isAction"`
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
	// Sort the anotations listed in config.Config.Annotations.Order first, in
	// the order they appear in that list; remaining annotations are sorted alphabetically.
	ai, aj := -1, -1
	for index, name := range config.Config.Annotations.Order {
		if a[i].Name == name {
			ai = index
		} else if a[j].Name == name {
			aj = index
		}
		// If both annotations are in c.C.A.Order, sort them according to the
		// order in that list.
		if ai >= 0 && aj >= 0 {
			return ai < aj
		}
	}
	// If only one of the annotations was in c.C.A.Order, that one goes first.
	if ai != aj {
		return aj < ai
	}
	// If neither annotation was in c.C.A.Order, sort alphabetically.
	return a[i].Name < a[j].Name
}

// AnnotationsFromMap will convert a map[string]string to a list of Annotation
// instances, it takes care of setting proper value for Visible attribute
func AnnotationsFromMap(m map[string]string) Annotations {
	annotations := make(Annotations, 0, len(m))
	for name, value := range m {
		a := Annotation{
			Name:     name,
			Value:    value,
			Visible:  isVisible(name),
			IsLink:   isLink(value),
			IsAction: isAction(name),
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
	if strings.Contains(s, " ") {
		return false
	}
	u, err := url.ParseRequestURI(s)
	if err != nil {
		return false
	}
	if slices.StringInSlice(linkSchemes, u.Scheme) {
		// parses with url.Parse and scheme is in the list of supported schemes
		return true
	}
	return false
}

func isVisible(name string) bool {
	if slices.StringInSlice(config.Config.Annotations.Visible, name) {
		// annotation was explicitly marked as visible
		return true
	}
	if slices.StringInSlice(config.Config.Annotations.Hidden, name) {
		// annotation was explicitly marked as hidden
		return false
	}
	if config.Config.Annotations.Default.Hidden {
		// user specified that default is to hide anything without explicit rules
		return false
	}
	// default to show everything
	return true
}

func isAction(name string) bool {
	return slices.StringInSlice(config.Config.Annotations.Actions, name)
}
