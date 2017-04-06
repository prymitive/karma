package alertmanager

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/transport"

	log "github.com/Sirupsen/logrus"
)

// SilenceAPIResponse is what Alertmanager API returns
type SilenceAPIResponse struct {
	Status    string                       `json:"status"`
	Data      []models.AlertmanagerSilence `json:"data"`
	ErrorType string                       `json:"errorType"`
	Error     string                       `json:"error"`
}

// Get will return fresh data from Alertmanager API
func (response *SilenceAPIResponse) Get() error {
	start := time.Now()

	url, err := transport.JoinURL(config.Config.AlertmanagerURI, "api/v1/silences")
	if err != nil {
		return err
	}
	url = fmt.Sprintf("%s?limit=%d", url, math.MaxUint32)

	err = transport.GetJSONFromURL(url, config.Config.AlertmanagerTimeout, response)
	if err != nil {
		return err
	}

	if response.Status != "success" {
		return errors.New(response.Error)
	}

	log.Infof("Got %d silences(s) in %s", len(response.Data), time.Since(start))
	return nil
}
