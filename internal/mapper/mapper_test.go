package mapper_test

import (
	"testing"

	"github.com/prymitive/karma/internal/mapper"
	v017 "github.com/prymitive/karma/internal/mapper/v017"
)

type testCaseType struct {
	requestedVersion string
	hadError         bool
	hadPanic         bool
}

var testCases = []testCaseType{
	{requestedVersion: "0.0", hadError: true},
	{requestedVersion: "abc", hadError: true, hadPanic: true},
	{requestedVersion: "0.1.0", hadError: true},
	{requestedVersion: "0.4.0", hadError: true},
	{requestedVersion: "0.4.0-rc-1", hadError: true},
	{requestedVersion: "0.5.1-beta", hadError: true},
	{requestedVersion: "0.6.6", hadError: true},
	{requestedVersion: "0.15.0", hadError: true},
	{requestedVersion: "0.16.0", hadError: true},
	{requestedVersion: "0.19.0"},
	{requestedVersion: "0.19.0-rc-1"},
	{requestedVersion: "0.19.0-beta.1"},
	{requestedVersion: "0.19.99-beta.1"},
	{requestedVersion: "0.20-beta.1"},
	{requestedVersion: "0.20"},
	{requestedVersion: "0.20.1"},
	{requestedVersion: "999.0"},
	{requestedVersion: ""},
}

func TestGetAlertMapper(t *testing.T) {
	mapper.RegisterAlertMapper(v017.AlertMapper{})

	for _, testCase := range testCases {
		t.Run(testCase.requestedVersion, func(t *testing.T) {
			hadPanic := false
			defer func() {
				if r := recover(); r != nil {
					hadPanic = true
					if hadPanic != testCase.hadPanic {
						t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
					}
				}
			}()

			m, err := mapper.GetAlertMapper(testCase.requestedVersion)
			if (err != nil) != testCase.hadError {
				t.Errorf("[%s] expected error=%v, got %v", testCase.requestedVersion, testCase.hadError, err)
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
			if m == nil && !testCase.hadError && !testCase.hadPanic {
				t.Errorf("[%s] got nil mapper", testCase.requestedVersion)
			}
		})
	}
}

func TestGetSilenceMapper(t *testing.T) {
	mapper.RegisterSilenceMapper(v017.SilenceMapper{})

	for _, testCase := range testCases {
		t.Run(testCase.requestedVersion, func(t *testing.T) {
			hadPanic := false
			defer func() {
				if r := recover(); r != nil {
					hadPanic = true
					if hadPanic != testCase.hadPanic {
						t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
					}
				}
			}()

			m, err := mapper.GetSilenceMapper(testCase.requestedVersion)
			if (err != nil) != testCase.hadError {
				t.Errorf("[%s] expected error=%v, got %v", testCase.requestedVersion, testCase.hadError, err)
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
			if m == nil && !testCase.hadError && !testCase.hadPanic {
				t.Errorf("[%s] got nil mapper", testCase.requestedVersion)
			}
		})
	}
}

func TestGetStatusMapper(t *testing.T) {
	mapper.RegisterStatusMapper(v017.StatusMapper{})

	for _, testCase := range testCases {
		t.Run(testCase.requestedVersion, func(t *testing.T) {
			hadPanic := false
			defer func() {
				if r := recover(); r != nil {
					hadPanic = true
					if hadPanic != testCase.hadPanic {
						t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
					}
				}
			}()

			m, err := mapper.GetStatusMapper(testCase.requestedVersion)
			if (err != nil) != testCase.hadError {
				t.Errorf("[%s] expected error=%v, got %v", testCase.requestedVersion, testCase.hadError, err)
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
			if m == nil && !testCase.hadError && !testCase.hadPanic {
				t.Errorf("[%s] got nil mapper", testCase.requestedVersion)
			}
		})
	}
}
