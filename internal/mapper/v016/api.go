package v016

import (
	"sort"
	"time"

	"github.com/prymitive/karma/internal/mapper/v016/client"
	"github.com/prymitive/karma/internal/mapper/v016/client/alertgroup"
	"github.com/prymitive/karma/internal/models"
)

// Alerts will fetch all alert groups from the API
func Groups() ([]models.AlertGroup, error) {
	ret := []models.AlertGroup{}

	transport := client.TransportConfig{
		Host:     "localhost:9093",
		BasePath: "/api/v2",
		Schemes:  []string{"http"},
	}
	cli := client.NewHTTPClientWithConfig(nil, &transport)

	timeout := time.Second * 30

	groups, err := cli.Alertgroup.GetAlertGroups(alertgroup.NewGetAlertGroupsParamsWithTimeout(timeout))
	if err != nil {
		return []models.AlertGroup{}, err
	}
	for _, group := range groups.Payload {
		g := models.AlertGroup{
			Receiver: *group.Receiver.Name,
			Labels:   group.Labels,
		}
		for _, alert := range group.Alerts {
			a := models.Alert{
				Receiver:     *group.Receiver.Name,
				Annotations:  models.AnnotationsFromMap(alert.Annotations),
				Labels:       alert.Labels,
				StartsAt:     time.Time(*alert.StartsAt),
				EndsAt:       time.Time(*alert.EndsAt),
				GeneratorURL: alert.GeneratorURL.String(),
				State:        *alert.Status.State,
				InhibitedBy:  alert.Status.InhibitedBy,
				SilencedBy:   alert.Status.SilencedBy,
			}
			sort.Strings(a.InhibitedBy)
			sort.Strings(a.SilencedBy)
			a.UpdateFingerprints()
			g.Alerts = append(g.Alerts, a)
		}
		ret = append(ret, g)
	}

	return ret, nil
}
