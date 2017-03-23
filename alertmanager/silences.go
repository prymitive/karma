package alertmanager

import (
	"errors"
	"fmt"
	"math"
	"time"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"

	log "github.com/Sirupsen/logrus"
)

type silencesData struct {
	Silences      []models.AlertManagerSilence `json:"silences"`
	TotalSilences int                          `json:"totalSilences"`
}

// SilenceAPIResponse is what AlertManager API returns
type SilenceAPIResponse struct {
	Status    string       `json:"status"`
	Data      silencesData `json:"data"`
	ErrorType string       `json:"errorType"`
	Error     string       `json:"error"`
}

// Get will return fresh data from AlertManager API
func (response *SilenceAPIResponse) Get() error {
	start := time.Now()

	url, err := joinURL(config.Config.AlertManagerURL, "api/v1/silences")
	if err != nil {
		return err
	}
	url = fmt.Sprintf("%s?limit=%d", url, math.MaxUint32)

	err = getJSONFromURL(url, config.Config.AlertManagerTimeout, response)
	if err != nil {
		return err
	}

	if response.Status != "success" {
		return errors.New(response.Error)
	}

	log.Infof("Got %d silences(s) in %s", len(response.Data.Silences), time.Since(start))
	return nil
}
