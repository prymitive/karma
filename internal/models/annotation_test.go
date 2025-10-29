package models_test

import (
	"sort"
	"testing"
	"unique"

	"github.com/google/go-cmp/cmp"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
)

type annotationMapsTestCase struct {
	annotationMap map[string]string
	annotations   models.Annotations
	visible       []string
	hidden        []string
	actions       []string
	defaultHidden bool
}

var annotationMapsTestCases = []annotationMapsTestCase{
	{
		annotationMap: map[string]string{
			"foo": "bar",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("foo"),
				Value:    models.NewUniqueString("bar"),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "http://localhost",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("foo"),
				Value:    models.NewUniqueString("http://localhost"),
				Visible:  true,
				IsLink:   true,
				IsAction: false,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "ftp://localhost",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("foo"),
				Value:    models.NewUniqueString("ftp://localhost"),
				Visible:  true,
				IsLink:   true,
				IsAction: false,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "https://localhost/xxx",
			"abc": "xyz",
			"act": "https://localhost/act ",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("abc"),
				Value:    models.NewUniqueString("xyz"),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
			models.Annotation{
				Name:     models.NewUniqueString("act"),
				Value:    models.NewUniqueString("https://localhost/act "),
				Visible:  true,
				IsLink:   true,
				IsAction: true,
			},
			models.Annotation{
				Name:     models.NewUniqueString("foo"),
				Value:    models.NewUniqueString("https://localhost/xxx"),
				Visible:  true,
				IsLink:   true,
				IsAction: false,
			},
		},
		actions: []string{"act"},
	},
	{
		annotationMap: map[string]string{
			"notLink": "https://some-links.domain.com/healthcheck in dev (job: blackbox) is not successfully probing via the blackbox prober. this could be due to the endpoint being offline, returning an invalid status code, taking too long to respond, etc.",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("notLink"),
				Value:    models.NewUniqueString("https://some-links.domain.com/healthcheck in dev (job: blackbox) is not successfully probing via the blackbox prober. this could be due to the endpoint being offline, returning an invalid status code, taking too long to respond, etc."),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"notLink": "mailto:me@example.com",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("notLink"),
				Value:    models.NewUniqueString("mailto:me@example.com"),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
		},
	},
	{
		defaultHidden: true,
		visible:       []string{"visible"},
		annotationMap: map[string]string{
			"hidden": "value",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("hidden"),
				Value:    models.NewUniqueString("value"),
				Visible:  false,
				IsLink:   false,
				IsAction: false,
			},
		},
	},
	{
		defaultHidden: true,
		visible:       []string{"visible"},
		hidden:        []string{"hidden"},
		annotationMap: map[string]string{
			"visible": "value",
			"hidden":  "value",
			"default": "value",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:     models.NewUniqueString("default"),
				Value:    models.NewUniqueString("value"),
				Visible:  false,
				IsLink:   false,
				IsAction: false,
			},
			models.Annotation{
				Name:     models.NewUniqueString("hidden"),
				Value:    models.NewUniqueString("value"),
				Visible:  false,
				IsLink:   false,
				IsAction: false,
			},
			models.Annotation{
				Name:     models.NewUniqueString("visible"),
				Value:    models.NewUniqueString("value"),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
		},
	},
}

func TestAnnotationsFromMap(t *testing.T) {
	cmpUnique := cmp.Comparer(func(x, y unique.Handle[string]) bool {
		return cmp.Equal(x.Value(), y.Value())
	})

	for _, testCase := range annotationMapsTestCases {
		config.Config.Annotations.Default.Hidden = testCase.defaultHidden
		config.Config.Annotations.Hidden = testCase.hidden
		config.Config.Annotations.Visible = testCase.visible
		config.Config.Annotations.Actions = testCase.actions
		result := models.AnnotationsFromMap(testCase.annotationMap)
		if diff := cmp.Diff(testCase.annotations, result, cmpUnique); diff != "" {
			t.Errorf("AnnotationsFromMap result mismatch (-want +got):\n%s", diff)
		}
	}
}

func TestAnnotationsSort(t *testing.T) {
	annotations := models.Annotations{
		models.Annotation{
			Name:    models.NewUniqueString("bar"),
			Value:   models.NewUniqueString("abc"),
			Visible: true,
			IsLink:  false,
		},
		models.Annotation{
			Name:    models.NewUniqueString("xyz"),
			Value:   models.NewUniqueString("xyz"),
			Visible: true,
			IsLink:  true,
		},
		models.Annotation{
			Name:    models.NewUniqueString("abc"),
			Value:   models.NewUniqueString("bar"),
			Visible: true,
			IsLink:  true,
		},
	}
	sort.Stable(annotations)
	if annotations[0].Name.Value() != "abc" {
		t.Errorf("Expected 'abc' to be first, got '%s'", annotations[0].Name.Value())
	}
	if annotations[2].Name.Value() != "xyz" {
		t.Errorf("Expected 'xyz' to be last, got '%s'", annotations[2].Name.Value())
	}
}

func TestAnnotationsCustomOrderSort(t *testing.T) {
	annotations := models.Annotations{
		models.Annotation{
			Name:    models.NewUniqueString("bar"),
			Value:   models.NewUniqueString("abc"),
			Visible: true,
			IsLink:  false,
		},
		models.Annotation{
			Name:    models.NewUniqueString("xyz"),
			Value:   models.NewUniqueString("xyz"),
			Visible: true,
			IsLink:  true,
		},
		models.Annotation{
			Name:    models.NewUniqueString("yyz"),
			Value:   models.NewUniqueString("yyz"),
			Visible: true,
			IsLink:  true,
		},
		models.Annotation{
			Name:    models.NewUniqueString("abc"),
			Value:   models.NewUniqueString("bar"),
			Visible: true,
			IsLink:  true,
		},
	}
	config.Config.Annotations.Order = []string{"xyz", "yyz"}
	sort.Stable(annotations)
	if annotations[0].Name.Value() != "xyz" {
		t.Errorf("Expected 'xyz' to be first, got '%s'", annotations[0].Name.Value())
	}
	if annotations[1].Name.Value() != "yyz" {
		t.Errorf("Expected 'yyz' to be second, got '%s'", annotations[1].Name.Value())
	}
	if annotations[2].Name.Value() != "abc" {
		t.Errorf("Expected 'abc' to be third, got '%s'", annotations[2].Name.Value())
	}
	if annotations[3].Name.Value() != "bar" {
		t.Errorf("Expected 'bar' to be last, got '%s'", annotations[3].Name.Value())
	}
}
