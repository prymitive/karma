package verprobe_test

import (
	"bytes"
	"testing"

	"github.com/prymitive/karma/internal/verprobe"
)

func TestDetect(t *testing.T) {
	type testCaseT struct {
		metrics string
		version string
		isError bool
	}

	testCases := []testCaseT{
		{
			metrics: "",
			version: "",
		},
		{
			metrics: "xxxx",
			version: "",
			isError: true,
		},
		{
			metrics: "alertmanager_build_info 1\n",
			version: "",
		},
		{
			metrics: "alertmanager_build_info{foo=\"bar\"} 1\n",
			version: "",
		},
		{
			metrics: "alertmanager_build_info{version=\"1.2.3\"} 1\n",
			version: "1.2.3",
		},
		{
			metrics: "alertmanager_build_info{foo=\"bar\"} 1",
			version: "",
			isError: true,
		},
	}

	for _, testCase := range testCases {
		r := bytes.NewBufferString(testCase.metrics)
		version, err := verprobe.Detect(r)
		isError := err != nil
		if isError != testCase.isError {
			t.Errorf("Version probe error=%q, expected isError=%v", err, testCase.isError)
		}
		if !isError {
			if version != testCase.version {
				t.Errorf("Version mismatch, got %q, expected %q", version, testCase.version)
			}
		}
	}
}
