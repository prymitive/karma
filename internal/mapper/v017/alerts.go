package v017

import (
	"net/http"
	"time"

	"github.com/Masterminds/semver"

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
	versionRange, err := semver.NewConstraint(">=0.17.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (m AlertMapper) IsOpenAPI() bool {
	return true
}

func (m AlertMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) ([]models.AlertGroup, error) {
	c := newClient(uri, headers, httpTransport)
	return groups(c, timeout)
}
