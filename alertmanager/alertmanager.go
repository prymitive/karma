package alertmanager

import (
	"time"

	"github.com/cloudflare/unsee/mapper"
	"github.com/cloudflare/unsee/mapper/v04"
	"github.com/cloudflare/unsee/mapper/v05"
	"github.com/cloudflare/unsee/models"

	log "github.com/Sirupsen/logrus"
)

// initialize all mappers
func init() {
	mapper.RegisterAlertMapper(v04.AlertMapper{})
	mapper.RegisterAlertMapper(v05.AlertMapper{})
	mapper.RegisterSilenceMapper(v04.SilenceMapper{})
	mapper.RegisterSilenceMapper(v05.SilenceMapper{})
}

// GetAlerts will send request to Alertmanager and return list of alert groups
// from the API
func GetAlerts(version string) ([]models.UnseeAlertGroup, error) {
	groups := []models.UnseeAlertGroup{}

	mapper, err := mapper.GetAlertMapper(version)
	if err != nil {
		return groups, err
	}

	start := time.Now()
	groups, err = mapper.GetAlerts()
	if err != nil {
		return groups, err
	}
	log.Infof("Got %d alert group(s) in %s", len(groups), time.Since(start))
	return groups, nil
}

// GetSilences will send request to Alertmanager and return list of silences
// from the API
func GetSilences(version string) ([]models.UnseeSilence, error) {
	silences := []models.UnseeSilence{}

	mapper, err := mapper.GetSilenceMapper(version)
	if err != nil {
		return silences, err
	}

	start := time.Now()
	silences, err = mapper.GetSilences()
	if err != nil {
		return silences, err
	}
	log.Infof("Got %d silences(s) in %s", len(silences), time.Since(start))
	return silences, nil
}
