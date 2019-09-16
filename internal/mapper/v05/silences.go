// Package v05 package implements support for interacting with Alertmanager 0.5
// Collected data will be mapped to karma internal schema defined the
// karma/models package
// This file defines Alertmanager alerts mapping
package v05

import (
	"errors"
	"io"
	"time"

	"github.com/Masterminds/semver/v3"

	"github.com/prymitive/karma/internal/json"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

type silence struct {
	ID       string `json:"id"`
	Matchers []struct {
		Name    string `json:"name"`
		Value   string `json:"value"`
		IsRegex bool   `json:"isRegex"`
	} `json:"matchers"`
	StartsAt  time.Time `json:"startsAt"`
	EndsAt    time.Time `json:"endsAt"`
	CreatedAt time.Time `json:"createdAt"`
	CreatedBy string    `json:"createdBy"`
	Comment   string    `json:"comment"`
}

type silenceAPISchema struct {
	Status string    `json:"status"`
	Data   []silence `json:"data"`
	Error  string    `json:"error"`
}

// SilenceMapper implements Alertmanager 0.4 API schema
type SilenceMapper struct {
	mapper.SilenceMapper
}

// AbsoluteURL for silences API endpoint this mapper supports
func (m SilenceMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v1/silences")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (m SilenceMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (m SilenceMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.5.0, <0.16.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (m SilenceMapper) IsOpenAPI() bool {
	return false
}

// Decode Alertmanager API response body and return karma model instances
func (m SilenceMapper) Decode(source io.ReadCloser) ([]models.Silence, error) {
	silences := []models.Silence{}
	resp := silenceAPISchema{}

	defer source.Close()
	err := json.JSON.NewDecoder(source).Decode(&resp)
	if err != nil {
		return silences, err
	}

	if resp.Status != mapper.AlertmanagerStatusString {
		return silences, errors.New(resp.Error)
	}

	for _, s := range resp.Data {
		us := models.Silence{
			ID:        s.ID,
			StartsAt:  s.StartsAt,
			EndsAt:    s.EndsAt,
			CreatedAt: s.CreatedAt,
			CreatedBy: s.CreatedBy,
			Comment:   s.Comment,
		}
		for _, m := range s.Matchers {
			sm := models.SilenceMatcher{
				Name:    m.Name,
				Value:   m.Value,
				IsRegex: m.IsRegex,
			}
			us.Matchers = append(us.Matchers, sm)
		}
		silences = append(silences, us)
	}
	return silences, nil
}
