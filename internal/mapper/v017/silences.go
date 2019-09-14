package v017

import (
	"net/http"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

// SilenceMapper implements Alertmanager 0.4 API schema
type SilenceMapper struct {
	mapper.SilenceMapper
}

// AbsoluteURL for silences API endpoint this mapper supports
func (m SilenceMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v2/silences")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (m SilenceMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (m SilenceMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.17.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (m SilenceMapper) IsOpenAPI() bool {
	return true
}

func (m SilenceMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) ([]models.Silence, error) {
	c := newClient(uri, headers, httpTransport)
	return silences(c, timeout)
}
