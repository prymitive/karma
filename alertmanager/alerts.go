package alertmanager

import (
	"errors"
	"time"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"

	log "github.com/Sirupsen/logrus"
)

// AlertGroupsAPIResponse is the schema of API response for /api/v1/alerts/groups
type AlertGroupsAPIResponse struct {
	Status    string                          `json:"status"`
	Groups    []models.AlertManagerAlertGroup `json:"data"`
	ErrorType string                          `json:"errorType"`
	Error     string                          `json:"error"`
}

// Get response from AlertManager /api/v1/alerts/groups
func (response *AlertGroupsAPIResponse) Get() error {
	start := time.Now()

	url, err := joinURL(config.Config.AlertManagerURL, "api/v1/alerts/groups")
	if err != nil {
		return err
	}

	err = getJSONFromURL(url, config.Config.AlertManagerTimeout, response)
	if err != nil {
		return err
	}

	if response.Status != "success" {
		return errors.New(response.Error)
	}

	log.Infof("Got %d alert group(s) in %s", len(response.Groups), time.Since(start))
	return nil
}
