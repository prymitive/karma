package v017

import (
	"net/http"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
)

// SilenceMapper implements Alertmanager 0.4 API schema
type SilenceMapper struct {
	mapper.SilenceMapper
}

// IsSupported returns true if given version string is supported
func (m SilenceMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.17.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

func (m SilenceMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) ([]models.Silence, error) {
	c := newClient(uri, headers, httpTransport)
	return silences(c, timeout)
}

func (m SilenceMapper) RewriteUsername(body []byte, username string) ([]byte, error) {
	return rewriteSilenceUsername(body, username)
}
