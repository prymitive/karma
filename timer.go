package main

import (
	"crypto/sha1"
	"fmt"
	"io"
	"runtime"
	"sort"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
	"github.com/cloudflare/unsee/transform"
	"github.com/cnf/structhash"

	log "github.com/Sirupsen/logrus"
	"github.com/prometheus/client_golang/prometheus"
)

// PullFromAlertmanager will try to fetch latest alerts and silences
// from Alertmanager API, it's called by Ticker timer
func PullFromAlertmanager() {
	// always flush cache once we're done
	defer apiCache.Flush()

	log.Info("Pulling latest alerts and silences from Alertmanager")
	v := alertmanager.GetVersion()

	silences, err := alertmanager.GetSilences(v)
	if err != nil {
		log.Error(err.Error())
		errorLock.Lock()
		alertManagerError = err.Error()
		errorLock.Unlock()
		metricAlertmanagerErrors.With(prometheus.Labels{"endpoint": "silences"}).Inc()
		return
	}

	alertGroups, err := alertmanager.GetAlerts(v)
	if err != nil {
		log.Error(err.Error())
		errorLock.Lock()
		alertManagerError = err.Error()
		errorLock.Unlock()
		metricAlertmanagerErrors.With(prometheus.Labels{"endpoint": "alerts"}).Inc()
		return
	}

	log.Infof("Detecting JIRA links in silences (%d)", len(silences))
	silenceStore := make(map[string]models.Silence)
	for _, silence := range silences {
		silence.JiraID, silence.JiraURL = transform.DetectJIRAs(&silence)
		silenceStore[silence.ID] = silence
	}

	log.Infof("Updating list of stored silences (%d)", len(silenceStore))
	store.Store.SetSilences(silenceStore)

	alertStore := []models.AlertGroup{}
	colorStore := make(models.LabelsColorMap)

	acMap := map[string]models.Autocomplete{}

	for _, state := range models.AlertStateList {
		metricAlerts.With(prometheus.Labels{"state": state}).Set(0)
	}

	log.Infof("Deduplicating alert groups (%d)", len(alertGroups))
	uniqueGroups := map[string]models.AlertGroup{}
	for _, ag := range alertGroups {
		agID := fmt.Sprintf("%x", structhash.Sha1(ag.Labels, 1))
		if _, found := uniqueGroups[agID]; !found {
			uniqueGroups[agID] = ag
		}
	}

	log.Infof("Processing unique alert groups (%d)", len(uniqueGroups))
	for _, ag := range uniqueGroups {
		// used to generate group content hash
		agHasher := sha1.New()

		alerts := models.AlertList{}
		for _, alert := range ag.Alerts {
			// generate alert fingerprint from a raw, unaltered alert object
			alert.Fingerprint = fmt.Sprintf("%x", structhash.Sha1(alert, 1))

			alert.Annotations, alert.Links = transform.DetectLinks(alert.Annotations)
			alert.Labels = transform.StripLables(config.Config.StripLabels, alert.Labels)

			io.WriteString(agHasher, alert.Fingerprint) // alert group hasher

			transform.ColorLabel(colorStore, "@receiver", alert.Receiver)
			for k, v := range alert.Labels {
				transform.ColorLabel(colorStore, k, v)
			}
			alerts = append(alerts, alert)

			// update internal metrics
			metricAlerts.With(prometheus.Labels{"state": alert.State}).Inc()
		}

		for _, hint := range transform.BuildAutocomplete(alerts) {
			acMap[hint.Value] = hint
		}

		sort.Sort(&alerts)
		ag.Alerts = alerts

		// ID is unique to each group
		ag.ID = fmt.Sprintf("%x", structhash.Sha1(ag.Labels, 1))
		// Hash is a checksum of all alerts, used to tell when any alert in the group changed
		ag.Hash = fmt.Sprintf("%x", agHasher.Sum(nil))

		alertStore = append(alertStore, ag)
	}

	log.Infof("Merging autocomplete data (%d)", len(acMap))
	acStore := []models.Autocomplete{}
	for _, hint := range acMap {
		acStore = append(acStore, hint)
	}

	errorLock.Lock()
	alertManagerError = ""
	errorLock.Unlock()

	metricAlertGroups.Set(float64(len(alertStore)))

	log.Infof("Updating list of stored alert groups (%d)", len(alertStore))
	store.Store.Update(alertStore, colorStore, acStore)
	log.Info("Pull completed")
	runtime.GC()
}

// Tick is the background timer used to call PullFromAlertmanager
func Tick() {
	for {
		select {
		case <-ticker.C:
			PullFromAlertmanager()
		}
	}
}
