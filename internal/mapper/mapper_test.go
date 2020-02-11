package mapper_test

import (
	"testing"

	"github.com/prymitive/karma/internal/mapper"
	v015 "github.com/prymitive/karma/internal/mapper/v015"
	v017 "github.com/prymitive/karma/internal/mapper/v017"
	v04 "github.com/prymitive/karma/internal/mapper/v04"
	v05 "github.com/prymitive/karma/internal/mapper/v05"
	v062 "github.com/prymitive/karma/internal/mapper/v062"
)

type testCaseType struct {
	requestedVersion string
	isOpenAPI        bool
	hadError         bool
	hadPanic         bool
}

var testCases = []testCaseType{
	{requestedVersion: "0.0", hadError: true},
	{requestedVersion: "abc", hadError: true, hadPanic: true},
	{requestedVersion: "0.4.0"},
	{requestedVersion: "0.4.0-rc-1"},
	{requestedVersion: "0.5.1-beta"},
	{requestedVersion: "0.6.6"},
	{requestedVersion: "0.15.0"},
	{requestedVersion: "0.16.0", hadError: true},
	{requestedVersion: "0.17.0", isOpenAPI: true},
	{requestedVersion: "0.17.0-rc-1", isOpenAPI: true},
	{requestedVersion: "0.17.0-beta.1", isOpenAPI: true},
	{requestedVersion: "0.17.99-beta.1", isOpenAPI: true},
	{requestedVersion: "0.18-beta.1", isOpenAPI: true},
	{requestedVersion: "0.18", isOpenAPI: true},
	{requestedVersion: "0.18.1", isOpenAPI: true},
}

func TestGetAlertMapper(t *testing.T) {
	mapper.RegisterAlertMapper(v04.AlertMapper{})
	mapper.RegisterAlertMapper(v05.AlertMapper{})
	mapper.RegisterAlertMapper(v062.AlertMapper{})
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
			if m != nil {
				if m.IsOpenAPI() != testCase.isOpenAPI {
					t.Errorf("[%s] expected IsOpenAPI=%v, got %v", testCase.requestedVersion, testCase.isOpenAPI, m.IsOpenAPI())
				}
				_, err := m.AbsoluteURL("/")
				if err != nil {
					t.Errorf("[%s] AbsoluteURL() returned an error: %v", testCase.requestedVersion, err)
				}
				m.QueryArgs()
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
		})
	}
}

func TestGetSilenceMapper(t *testing.T) {
	mapper.RegisterSilenceMapper(v04.SilenceMapper{})
	mapper.RegisterSilenceMapper(v05.SilenceMapper{})
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
			if m != nil {
				if m.IsOpenAPI() != testCase.isOpenAPI {
					t.Errorf("[%s] expected IsOpenAPI=%v, got %v", testCase.requestedVersion, testCase.isOpenAPI, m.IsOpenAPI())
				}
				_, err := m.AbsoluteURL("/")
				if err != nil {
					t.Errorf("[%s] AbsoluteURL() returned an error: %v", testCase.requestedVersion, err)
				}
				m.QueryArgs()
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
		})
	}
}

func TestGetStatusMapper(t *testing.T) {
	mapper.RegisterStatusMapper(v04.StatusMapper{})
	mapper.RegisterStatusMapper(v015.StatusMapper{})
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
			if m != nil {
				if m.IsOpenAPI() != testCase.isOpenAPI {
					t.Errorf("[%s] expected IsOpenAPI=%v, got %v", testCase.requestedVersion, testCase.isOpenAPI, m.IsOpenAPI())
				}
				_, err := m.AbsoluteURL("/")
				if err != nil {
					t.Errorf("[%s] AbsoluteURL() returned an error: %v", testCase.requestedVersion, err)
				}
				m.QueryArgs()
			}
			if hadPanic != testCase.hadPanic {
				t.Errorf("[%s] expected panic=%v, got %v", testCase.requestedVersion, testCase.hadPanic, hadPanic)
			}
		})
	}
}
