// Package v04 package implements support for interacting with Alertmanager 0.4
// Collected data will be mapped to unsee internal schema defined the
// unsee/models package
// This file defines Alertmanager alerts mapping
package v04

import (
	"errors"
	"time"

	"github.com/blang/semver"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/mapper"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/transport"
)

// AlertmanagerAlert is vanilla alert object from Alertmanager 0.4
type alert struct {
	Annotations  map[string]string `json:"annotations"`
	Labels       map[string]string `json:"labels"`
	StartsAt     time.Time         `json:"startsAt"`
	EndsAt       time.Time         `json:"endsAt"`
	GeneratorURL string            `json:"generatorURL"`
	Inhibited    bool              `json:"inhibited"`
	Silenced     int               `json:"silenced"`
}

// alertsGroupsV04 is vanilla group object from Alertmanager, exposed under api/v1/alerts/groups
type alertsGroups struct {
	Labels map[string]string `json:"labels"`
	Blocks []struct {
		Alerts []alert `json:"alerts"`
	} `json:"blocks"`
}

type alertsGroupsAPISchema struct {
	Status string         `json:"status"`
	Groups []alertsGroups `json:"data"`
	Error  string         `json:"error"`
}

// AlertMapper implements Alertmanager 0.4 API schema
type AlertMapper struct {
	mapper.AlertMapper
}

// IsSupported returns true if given version string is supported
func (m AlertMapper) IsSupported(version string) bool {
	versionRange := semver.MustParseRange(">=0.4.0 <0.5.0")
	return versionRange(semver.MustParse(version))
}

// GetAlerts will make a request to Alertmanager API and parse the response
// It will only return alerts or error (if any)
func (m AlertMapper) GetAlerts() ([]models.AlertGroup, error) {
	groups := []models.AlertGroup{}
	resp := alertsGroupsAPISchema{}

	url, err := transport.JoinURL(config.Config.AlertmanagerURI, "api/v1/alerts/groups")
	if err != nil {
		return groups, err
	}

	err = transport.ReadJSON(url, config.Config.AlertmanagerTimeout, &resp)
	if err != nil {
		return groups, err
	}

	if resp.Status != "success" {
		return groups, errors.New(resp.Error)
	}

	for _, g := range resp.Groups {
		alertList := models.AlertList{}
		for _, b := range g.Blocks {
			for _, a := range b.Alerts {
				us := models.Alert{
					Annotations:  a.Annotations,
					Labels:       a.Labels,
					StartsAt:     a.StartsAt,
					EndsAt:       a.EndsAt,
					GeneratorURL: a.GeneratorURL,
					Inhibited:    a.Inhibited,
				}
				if a.Silenced > 0 {
					us.Silenced = string(a.Silenced)
				}
				alertList = append(alertList, us)
			}
		}
		ug := models.AlertGroup{
			Labels: g.Labels,
			Alerts: alertList,
		}
		groups = append(groups, ug)
	}
	return groups, nil
}
