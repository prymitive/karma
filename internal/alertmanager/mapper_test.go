package alertmanager

import (
	"testing"

	"github.com/prymitive/karma/internal/mapper"
)

func TestGetAlertMapper(t *testing.T) {
	versions := []string{
		"0.17.0",
		"0.20.0-rc.0",
		"0.20.0-rc.0-2",
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

		_, err = mapper.GetStatusMapper(version)
		if err != nil {
			t.Errorf("mapper.GetStatusMapper(%s) returned error: %s", version, err)
		}
	}
}
