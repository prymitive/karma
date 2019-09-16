// Package v05 package implements support for interacting with Alertmanager 0.5
// Collected data will be mapped to karma internal schema defined the
// karma/models package
// This file defines Alertmanager alerts mapping
package v05

import (
	"errors"
	"io"
	"sort"
	"time"

	"github.com/Masterminds/semver/v3"

	"github.com/prymitive/karma/internal/json"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

type alert struct {
	Annotations  map[string]string `json:"annotations"`
	Labels       map[string]string `json:"labels"`
	StartsAt     time.Time         `json:"startsAt"`
	GeneratorURL string            `json:"generatorURL"`
	Inhibited    bool              `json:"inhibited"`
	Silenced     string            `json:"silenced"`
}

type alertsGroups struct {
	Labels map[string]string `json:"labels"`
	Blocks []struct {
		Alerts   []alert `json:"alerts"`
		RouteOps struct {
			Receiver string `json:"receiver"`
		} `json:"routeOpts"`
	} `json:"blocks"`
}

type alertsGroupsAPISchema struct {
	Status string         `json:"status"`
	Data   []alertsGroups `json:"data"`
	Error  string         `json:"error"`
}

type alertsGroupReceiver struct {
	Name   string
	Groups []models.AlertGroup
}

// AlertMapper implements Alertmanager API schema
type AlertMapper struct {
	mapper.AlertMapper
}

// AbsoluteURL for alerts API endpoint this mapper supports
func (m AlertMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v1/alerts/groups")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (m AlertMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (m AlertMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.5.0, <=0.6.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (m AlertMapper) IsOpenAPI() bool {
	return false
}

// Decode Alertmanager API response body and return karma model instances
func (m AlertMapper) Decode(source io.ReadCloser) ([]models.AlertGroup, error) {
	groups := []models.AlertGroup{}
	receivers := map[string]alertsGroupReceiver{}
	resp := alertsGroupsAPISchema{}

	defer source.Close()
	err := json.JSON.NewDecoder(source).Decode(&resp)
	if err != nil {
		return groups, err
	}

	if resp.Status != mapper.AlertmanagerStatusString {
		return groups, errors.New(resp.Error)
	}

	for _, d := range resp.Data {
		for _, b := range d.Blocks {
			rcv, found := receivers[b.RouteOps.Receiver]
			if !found {
				rcv = alertsGroupReceiver{
					Name: b.RouteOps.Receiver,
				}
				receivers[b.RouteOps.Receiver] = rcv
			}
			alertList := models.AlertList{}
			for _, a := range b.Alerts {
				status := models.AlertStateActive
				silencedBy := []string{}
				if a.Silenced != "" {
					silencedBy = append(silencedBy, a.Silenced)
					status = models.AlertStateSuppressed
				}
				inhibitedBy := []string{}
				if a.Inhibited {
					inhibitedBy = append(inhibitedBy, "0")
					status = models.AlertStateSuppressed
				}
				a := models.Alert{
					Receiver:     rcv.Name,
					Annotations:  models.AnnotationsFromMap(a.Annotations),
					Labels:       a.Labels,
					StartsAt:     a.StartsAt,
					GeneratorURL: a.GeneratorURL,
					State:        status,
					InhibitedBy:  inhibitedBy,
					SilencedBy:   silencedBy,
				}
				sort.Strings(a.InhibitedBy)
				sort.Strings(a.SilencedBy)
				a.UpdateFingerprints()
				alertList = append(alertList, a)
			}
			ug := models.AlertGroup{
				Receiver: rcv.Name,
				Labels:   d.Labels,
				Alerts:   alertList,
			}
			rcv.Groups = append(rcv.Groups, ug)
			receivers[rcv.Name] = rcv
		}
	}
	for _, rcv := range receivers {
		groups = append(groups, rcv.Groups...)
	}
	return groups, nil
}
