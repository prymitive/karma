package main

import (
	"crypto/sha1"
	"fmt"
	"io"
	"runtime"
	"sort"
	"strconv"
	"time"
	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
	"github.com/cloudflare/unsee/transform"

	log "github.com/Sirupsen/logrus"
	"github.com/cnf/structhash"
	"github.com/prometheus/client_golang/prometheus"
)

// PullFromAlertManager will try to fetch latest alerts and silences
// from AlertManager API, it's called by Ticker timer
func PullFromAlertManager() {
	log.Info("Pulling latest alerts and silences from AlertManager")

	silenceResponse := alertmanager.SilenceAPIResponse{}
	err := silenceResponse.Get()
	if err != nil {
		log.Error(err.Error())
		errorLock.Lock()
		alertManagerError = err.Error()
		errorLock.Unlock()
		metricAlertManagerErrors.With(prometheus.Labels{"endpoint": "silences"}).Inc()
		return
	}

	alertGroups := alertmanager.AlertGroupsAPIResponse{}
	err = alertGroups.Get()
	if err != nil {
		log.Error(err.Error())
		errorLock.Lock()
		alertManagerError = err.Error()
		errorLock.Unlock()
		metricAlertManagerErrors.With(prometheus.Labels{"endpoint": "alerts"}).Inc()
		return
	}

	silenceStore := make(map[string]models.UnseeSilence)
	for _, silence := range silenceResponse.Data.Silences {
		jiraID, jiraLink := transform.DetectJIRAs(&silence)
		silenceStore[strconv.Itoa(silence.ID)] = models.UnseeSilence{
			AlertManagerSilence: silence,
			JiraID:              jiraID,
			JiraURL:             jiraLink,
		}
	}

	store.StoreLock.Lock()
	store.SilenceStore.Store = silenceStore
	store.SilenceStore.Timestamp = time.Now()
	store.StoreLock.Unlock()

	alertStore := []models.UnseeAlertGroup{}
	colorStore := make(models.UnseeColorMap)

	acMap := map[string]models.UnseeAutocomplete{}

	// counters used to update metrics
	var counterAlertsSilenced float64
	var counterAlertsUnsilenced float64

	for _, alertGroup := range alertGroups.Groups {
		if len(alertGroup.Blocks) == 0 {
			// skip groups with empty blocks
			continue
		}

		// used to generate group content hash
		agHasher := sha1.New()

		ag := models.UnseeAlertGroup{
			Labels: alertGroup.Labels,
			Alerts: []models.UnseeAlert{},
		}

		alerts := map[string]models.UnseeAlert{}

		ignoredLabels := []string{}
		for _, il := range config.Config.StripLabels {
			ignoredLabels = append(ignoredLabels, il)
		}

		for _, alertBlock := range alertGroup.Blocks {
			for _, alert := range alertBlock.Alerts {
				apiAlert := models.UnseeAlert{AlertManagerAlert: alert}

				apiAlert.Annotations, apiAlert.Links = transform.DetectLinks(apiAlert.Annotations)

				apiAlert.Labels = transform.StripLables(ignoredLabels, apiAlert.Labels)

				hash := fmt.Sprintf("%x", structhash.Sha1(apiAlert, 1))

				// add alert to map if not yet present
				if _, found := alerts[hash]; !found {
					alerts[hash] = apiAlert
					io.WriteString(agHasher, hash) // alert group hasher
				}

				for k, v := range alert.Labels {
					transform.ColorLabel(colorStore, k, v)
				}
			}
		}

		for _, alert := range alerts {
			ag.Alerts = append(ag.Alerts, alert)
			if alert.Silenced > 0 {
				counterAlertsSilenced++
			} else {
				counterAlertsUnsilenced++
			}
		}

		for _, hint := range transform.BuildAutocomplete(ag.Alerts) {
			acMap[hint.Value] = hint
		}

		sort.Sort(&ag.Alerts)

		// ID is unique to each group
		ag.ID = fmt.Sprintf("%x", structhash.Sha1(ag.Labels, 1))
		// Hash is a checksum of all alerts, used to tell when any alert in the group changed
		ag.Hash = fmt.Sprintf("%x", agHasher.Sum(nil))
		alertStore = append(alertStore, ag)
	}

	acStore := []models.UnseeAutocomplete{}
	for _, hint := range acMap {
		acStore = append(acStore, hint)
	}

	errorLock.Lock()
	alertManagerError = ""
	errorLock.Unlock()

	metricAlerts.With(prometheus.Labels{"silenced": "true"}).Set(counterAlertsSilenced)
	metricAlerts.With(prometheus.Labels{"silenced": "false"}).Set(counterAlertsUnsilenced)
	metricAlertGroups.Set(float64(len(alertStore)))

	now := time.Now()

	store.StoreLock.Lock()
	store.AlertStore.Store = alertStore
	store.AlertStore.Timestamp = now
	store.ColorStore.Store = colorStore
	store.ColorStore.Timestamp = now
	store.AutocompleteStore.Store = acStore
	store.AutocompleteStore.Timestamp = now
	store.StoreLock.Unlock()
	log.Info("Pull completed")
	apiCache.Flush()
	runtime.GC()
}

// Tick is the background timer used to call PullFromAlertManager
func Tick() {
	for {
		select {
		case <-ticker.C:
			PullFromAlertManager()
		}
	}
}
