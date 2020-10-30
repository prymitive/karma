package mapper

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/models"
)

var (
	alertMappers   = []AlertMapper{}
	silenceMappers = []SilenceMapper{}
	statusMappers  = []StatusMapper{}
)

// Mapper converts Alertmanager response body and maps to karma data structures
type Mapper interface {
	IsSupported(version string) bool
}

// AlertMapper handles mapping of Alertmanager alert information to karma AlertGroup models
type AlertMapper interface {
	Mapper
	Collect(string, map[string]string, time.Duration, http.RoundTripper) ([]models.AlertGroup, error)
}

// SilenceMapper handles mapping of Alertmanager silence information to karma Silence models
type SilenceMapper interface {
	Mapper
	Collect(string, map[string]string, time.Duration, http.RoundTripper) ([]models.Silence, error)
	RewriteUsername([]byte, string) ([]byte, error)
	Unmarshal([]byte) (*models.Silence, error)
}

// StatusMapper handles mapping Alertmanager status information containing cluster config
type StatusMapper interface {
	Mapper
	Collect(string, map[string]string, time.Duration, http.RoundTripper) (models.AlertmanagerStatus, error)
}

// RegisterAlertMapper allows to register mapper implementing alert data
// handling for specific Alertmanager versions
func RegisterAlertMapper(m AlertMapper) {
	alertMappers = append(alertMappers, m)
}

func fixSemVersion(version string) string {
	// https://github.com/Masterminds/semver/issues/135
	return strings.SplitN(version, "-", 2)[0]
}

func latestIfEmpty(version string) string {
	if version == "" {
		return "999.0"
	}
	return version
}

// GetAlertMapper returns mapper for given version
func GetAlertMapper(version string) (AlertMapper, error) {
	ver := latestIfEmpty(version)
	for _, m := range alertMappers {
		if m.IsSupported(fixSemVersion(ver)) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("can't find alert mapper for Alertmanager %s", version)
}

// RegisterSilenceMapper allows to register mapper implementing silence data
// handling for specific Alertmanager versions
func RegisterSilenceMapper(m SilenceMapper) {
	silenceMappers = append(silenceMappers, m)
}

// GetSilenceMapper returns mapper for given version
func GetSilenceMapper(version string) (SilenceMapper, error) {
	ver := latestIfEmpty(version)
	for _, m := range silenceMappers {
		if m.IsSupported(fixSemVersion(ver)) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("can't find silence mapper for Alertmanager %s", version)
}

// RegisterStatusMapper allows to register mapper implementing status data
// handling for specific Alertmanager versions
func RegisterStatusMapper(m StatusMapper) {
	statusMappers = append(statusMappers, m)
}

// GetStatusMapper returns mapper for given version
func GetStatusMapper(version string) (StatusMapper, error) {
	ver := latestIfEmpty(version)
	for _, m := range statusMappers {
		if m.IsSupported(fixSemVersion(ver)) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("can't find status mapper for Alertmanager %s", version)
}
