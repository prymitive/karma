package mapper

import (
	"fmt"
	"io"

	"github.com/cloudflare/unsee/internal/models"
)

var (
	alertMappers   = []AlertMapper{}
	silenceMappers = []SilenceMapper{}
)

// Mapper converts Alertmanager response body and maps to unsee data structures
type Mapper interface {
	IsSupported(version string) bool
	AbsoluteURL(baseURI string) (string, error)
	QueryArgs() string
}

// AlertMapper handles mapping of Alertmanager alert information to unsee AlertGroup models
type AlertMapper interface {
	Mapper
	Decode(io.ReadCloser) ([]models.AlertGroup, error)
}

// SilenceMapper handles mapping of Alertmanager silence information to unsee Silence models
type SilenceMapper interface {
	Mapper
	Decode(io.ReadCloser) ([]models.Silence, error)
}

// RegisterAlertMapper allows to register mapper implementing alert data
// handling for specific Alertmanager versions
func RegisterAlertMapper(m AlertMapper) {
	alertMappers = append(alertMappers, m)
}

// GetAlertMapper returns mapper for given version
func GetAlertMapper(version string) (AlertMapper, error) {
	for _, m := range alertMappers {
		if m.IsSupported(version) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("Can't find alert mapper for Alertmanager %s", version)
}

// RegisterSilenceMapper allows to register mapper implementing silence data
// handling for specific Alertmanager versions
func RegisterSilenceMapper(m SilenceMapper) {
	silenceMappers = append(silenceMappers, m)
}

// GetSilenceMapper returns mapper for given version
func GetSilenceMapper(version string) (SilenceMapper, error) {
	for _, m := range silenceMappers {
		if m.IsSupported(version) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("Can't find silence mapper for Alertmanager %s", version)
}
