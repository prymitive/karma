package v016

import (
	"io"

	"github.com/blang/semver"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

// AlertMapper implements Alertmanager API schema
type AlertMapper struct {
	mapper.AlertMapper
}

// AbsoluteURL for alerts API endpoint this mapper supports
func (m AlertMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v2/alerts/groups")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (m AlertMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (m AlertMapper) IsSupported(version string) bool {
	versionRange := semver.MustParseRange(">=0.16.1")
	return versionRange(semver.MustParse(version))
}

// Decode Alertmanager API response body and return karma model instances
func (m AlertMapper) Decode(source io.ReadCloser) ([]models.AlertGroup, error) {
	defer source.Close()
	return Groups()
}
