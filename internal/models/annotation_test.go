package models_test

import (
	"reflect"
	"testing"

	"github.com/cloudflare/unsee/internal/models"
)

type annotationMapsTestCase struct {
	annotationMap map[string]string
	annotations   models.Annotations
}

var annotationMapsTestCases = []annotationMapsTestCase{
	annotationMapsTestCase{
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
	annotationMapsTestCase{
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
	annotationMapsTestCase{
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
	annotationMapsTestCase{
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
