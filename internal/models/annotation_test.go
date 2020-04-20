package models_test

import (
	"reflect"
	"sort"
	"testing"

	"github.com/prymitive/karma/internal/models"
)

type annotationMapsTestCase struct {
	annotationMap map[string]string
	annotations   models.Annotations
}

var annotationMapsTestCases = []annotationMapsTestCase{
	{
		annotationMap: map[string]string{
			"foo": "bar",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:    "foo",
				Value:   "bar",
				Visible: true,
				IsLink:  false,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "http://localhost",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:    "foo",
				Value:   "http://localhost",
				Visible: true,
				IsLink:  true,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "ftp://localhost",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:    "foo",
				Value:   "ftp://localhost",
				Visible: true,
				IsLink:  true,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"foo": "https://localhost/xxx",
			"abc": "xyz",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:    "abc",
				Value:   "xyz",
				Visible: true,
				IsLink:  false,
			},
			models.Annotation{
				Name:    "foo",
				Value:   "https://localhost/xxx",
				Visible: true,
				IsLink:  true,
			},
		},
	},
	{
		annotationMap: map[string]string{
			"notLink": "https://some-links.domain.com/healthcheck in dev (job: blackbox) is not successfully probing via the blackbox prober. this could be due to the endpoint being offline, returning an invalid status code, taking too long to respond, etc.",
		},
		annotations: models.Annotations{
			models.Annotation{
				Name:    "notLink",
				Value:   "https://some-links.domain.com/healthcheck in dev (job: blackbox) is not successfully probing via the blackbox prober. this could be due to the endpoint being offline, returning an invalid status code, taking too long to respond, etc.",
				Visible: true,
				IsLink:  false,
			},
		},
	},
}

func TestAnnotationsFromMap(t *testing.T) {
	for _, testCase := range annotationMapsTestCases {
		result := models.AnnotationsFromMap(testCase.annotationMap)
		if !reflect.DeepEqual(testCase.annotations, result) {
			t.Errorf("AnnotationsFromMap result mismatch for map %v, expected %v got %v",
				testCase.annotationMap, testCase.annotations, result)
		}
	}
}

func TestAnnotationsSort(t *testing.T) {
	annotations := models.Annotations{
		models.Annotation{
			Name:    "bar",
			Value:   "abc",
			Visible: true,
			IsLink:  false,
		},
		models.Annotation{
			Name:    "xyz",
			Value:   "xyz",
			Visible: true,
			IsLink:  true,
		},
		models.Annotation{
			Name:    "abc",
			Value:   "bar",
			Visible: true,
			IsLink:  true,
		},
	}
	sort.Stable(annotations)
	if annotations[0].Name != "abc" {
		t.Errorf("Expected 'abc' to be first, got '%s'", annotations[0].Name)
	}
	if annotations[2].Name != "xyz" {
		t.Errorf("Expected 'xyz' to be last, got '%s'", annotations[2].Name)
	}
}
