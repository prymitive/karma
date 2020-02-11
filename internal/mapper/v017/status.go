package v017

import (
	"net/http"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
)

// StatusMapper implements Alertmanager API schema
type StatusMapper struct {
	mapper.StatusMapper
}

// IsSupported returns true if given version string is supported
func (s StatusMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.17.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

func (s StatusMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) (models.AlertmanagerStatus, error) {
	c := newClient(uri, headers, httpTransport)
	return status(c, timeout)
}
