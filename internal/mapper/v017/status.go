package v017

import (
	"net/http"
	"time"

	"github.com/blang/semver"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

// StatusMapper implements Alertmanager API schema
type StatusMapper struct {
	mapper.StatusMapper
}

// AbsoluteURL for status API endpoint this mapper supports
func (s StatusMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v1/status")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (s StatusMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (s StatusMapper) IsSupported(version string) bool {
	versionRange := semver.MustParseRange(">=0.17.0")
	return versionRange(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (s StatusMapper) IsOpenAPI() bool {
	return true
}

func (s StatusMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) (models.AlertmanagerStatus, error) {
	c := newClient(uri, headers, httpTransport)
	return status(c, timeout)
}
