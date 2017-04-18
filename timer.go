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

	log "github.com/Sirupsen/logrus"
	"github.com/cnf/structhash"
	"github.com/prometheus/client_golang/prometheus"
)

// PullFromAlertmanager will try to fetch latest alerts and silences
// from Alertmanager API, it's called by Ticker timer
func PullFromAlertmanager() {
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

	silenceStore := make(map[string]models.Silence)
	for _, silence := range silences {
		silence.JiraID, silence.JiraURL = transform.DetectJIRAs(&silence)
		silenceStore[silence.ID] = silence
	}

	store.Store.SetSilences(silenceStore)

	alertStore := []models.AlertGroup{}
	colorStore := make(models.LabelsColorMap)

	acMap := map[string]models.Autocomplete{}

	metricAlerts.With(prometheus.Labels{"silenced": "true", "inhibited": "true"}).Set(0)
	metricAlerts.With(prometheus.Labels{"silenced": "true", "inhibited": "false"}).Set(0)
	metricAlerts.With(prometheus.Labels{"silenced": "false", "inhibited": "true"}).Set(0)
	metricAlerts.With(prometheus.Labels{"silenced": "false", "inhibited": "false"}).Set(0)

	for _, ag := range alertGroups {
		// used to generate group content hash
		agHasher := sha1.New()

		alerts := map[string]models.Alert{}

		ignoredLabels := []string{}
		for _, il := range config.Config.StripLabels {
			ignoredLabels = append(ignoredLabels, il)
		}

		for _, alert := range ag.Alerts {
			// skip duplicated alerts
			if _, found := alerts[alert.Fingerprint]; found {
				continue
			}

			alert.Annotations, alert.Links = transform.DetectLinks(alert.Annotations)
			alert.Labels = transform.StripLables(ignoredLabels, alert.Labels)
			alert.Fingerprint = fmt.Sprintf("%x", structhash.Sha1(alert, 1))

			alerts[alert.Fingerprint] = alert

			io.WriteString(agHasher, alert.Fingerprint) // alert group hasher

			for k, v := range alert.Labels {
				transform.ColorLabel(colorStore, k, v)
			}

		}

		// reset alerts, we need to deduplicate
		ag.Alerts = []models.Alert{}
		for _, alert := range alerts {
			ag.Alerts = append(ag.Alerts, alert)
			if alert.Silenced != "" {
				if alert.Inhibited {
					metricAlerts.With(prometheus.Labels{"silenced": "true", "inhibited": "true"}).Inc()
				} else {
					metricAlerts.With(prometheus.Labels{"silenced": "true", "inhibited": "false"}).Inc()
				}
			} else {
				if alert.Inhibited {
					metricAlerts.With(prometheus.Labels{"silenced": "false", "inhibited": "true"}).Inc()
				} else {
					metricAlerts.With(prometheus.Labels{"silenced": "false", "inhibited": "false"}).Inc()
				}
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

	acStore := []models.Autocomplete{}
	for _, hint := range acMap {
		acStore = append(acStore, hint)
	}

	errorLock.Lock()
	alertManagerError = ""
	errorLock.Unlock()

	metricAlertGroups.Set(float64(len(alertStore)))

	store.Store.Update(alertStore, colorStore, acStore)
	log.Info("Pull completed")
	apiCache.Flush()
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
