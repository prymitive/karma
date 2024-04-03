package alertmanager

import (
	"testing"

	"github.com/prymitive/karma/internal/mapper"
)

func TestGetAlertMapper(t *testing.T) {
	versions := []string{
		"0.22.0",
		"0.24.0-rc.0",
		"0.24.0-rc.0-2",
	}

	for _, version := range versions {
		_, err := mapper.GetAlertMapper(version)
		if err != nil {
			t.Errorf("mapper.GetAlertMapper(%s) returned error: %s", version, err)
		}

		_, err = mapper.GetSilenceMapper(version)
		if err != nil {
			t.Errorf("mapper.GetSilenceMapper(%s) returned error: %s", version, err)
		}
	}
}

func TestGetInvalidAlertMapper(t *testing.T) {
	versions := []string{
		"0.16.0",
		"0.10.0-rc.0",
		"0.21.4",
	}

	for _, version := range versions {
		_, err := mapper.GetAlertMapper(version)
		if err == nil {
			t.Errorf("mapper.GetAlertMapper(%s) didn't return an error", version)
		}

		_, err = mapper.GetSilenceMapper(version)
		if err == nil {
			t.Errorf("mapper.GetSilenceMapper(%s) didn't return an error", version)
		}
	}
}
