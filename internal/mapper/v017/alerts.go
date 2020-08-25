package v017

import (
	"net/http"
	"time"

	"github.com/Masterminds/semver/v3"

	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
)

// AlertMapper implements Alertmanager API schema
type AlertMapper struct {
	mapper.AlertMapper
}

// IsSupported returns true if given version string is supported
func (m AlertMapper) IsSupported(version string) bool {
	// no need to check for errors as we pass static value
	versionRange, _ := semver.NewConstraint(">=0.19.0")
	return versionRange.Check(semver.MustParse(version))
}

func (m AlertMapper) Collect(uri string, headers map[string]string, timeout time.Duration, httpTransport http.RoundTripper) ([]models.AlertGroup, error) {
	c := newClient(uri, headers, httpTransport)
	return groups(c, timeout)
}
