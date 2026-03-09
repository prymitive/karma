package models

import (
	"net/url"
	"slices"
	"strings"

	"github.com/fvbommel/sortorder"

	"github.com/prymitive/karma/internal/config"
)

// Annotation extends Alertmanager scheme of key:value with additional data
// to control how given annotation should be rendered
type Annotation struct {
	Name     UniqueString `json:"name"`
	Value    UniqueString `json:"value"`
	Visible  bool         `json:"visible"`
	IsLink   bool         `json:"isLink"`
	IsAction bool         `json:"isAction"`
}

// Annotations is a slice of Annotation structs, needed to implement sorting
type Annotations []Annotation

func compareAnnotations(a, b Annotation) int {
	// Sort the annotations listed in config.Config.Annotations.Order first, in
	// the order they appear in that list; remaining annotations are sorted alphabetically.
	ai, bi := -1, -1
	for index, name := range config.Config.Annotations.Order {
		if a.Name.Value() == name {
			ai = index
		} else if b.Name.Value() == name {
			bi = index
		}
		// If both annotations are in c.C.A.Order, sort them according to the
		// order in that list.
		if ai >= 0 && bi >= 0 {
			if ai < bi {
				return -1
			}
			return 1
		}
	}
	// If only one of the annotations was in c.C.A.Order, that one goes first.
	if ai != bi {
		if bi < ai {
			return -1
		}
		return 1
	}
	// If neither annotation was in c.C.A.Order, sort alphabetically.
	if sortorder.NaturalLess(a.Name.Value(), b.Name.Value()) {
		return -1
	}
	if sortorder.NaturalLess(b.Name.Value(), a.Name.Value()) {
		return 1
	}
	return 0
}

// AnnotationsFromMap will convert a map[string]string to a list of Annotation
// instances, it takes care of setting proper value for Visible attribute
func AnnotationsFromMap(m map[string]string) Annotations {
	annotations := make(Annotations, 0, len(m))
	for name, value := range m {
		a := Annotation{
			Name:     NewUniqueString(name),
			Value:    NewUniqueString(value),
			Visible:  isVisible(name),
			IsLink:   isLink(value),
			IsAction: isAction(name),
		}
		annotations = append(annotations, a)
	}
	SortAnnotations(annotations)
	return annotations
}

func SortAnnotations(annotations Annotations) {
	slices.SortFunc(annotations, compareAnnotations)
}

var linkSchemes = []string{
	"ftp",
	"http",
	"https",
}

func isLink(s string) bool {
	s = strings.TrimSpace(s)

	if strings.Contains(s, " ") {
		return false
	}
	u, err := url.ParseRequestURI(s)
	if err != nil {
		return false
	}
	if slices.Contains(linkSchemes, u.Scheme) {
		// parses with url.Parse and scheme is in the list of supported schemes
		return true
	}
	return false
}

func isVisible(name string) bool {
	if slices.Contains(config.Config.Annotations.Visible, name) {
		// annotation was explicitly marked as visible
		return true
	}
	if slices.Contains(config.Config.Annotations.Hidden, name) {
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
	return slices.Contains(config.Config.Annotations.Actions, name)
}
