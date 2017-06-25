package alertmanager

import (
	"crypto/sha1"
	"fmt"
	"io"
	"sort"
	"sync"
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/mapper"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/transform"
	"github.com/cloudflare/unsee/transport"
	"github.com/cnf/structhash"
	"github.com/prometheus/client_golang/prometheus"

	log "github.com/Sirupsen/logrus"
)

// Alertmanager represents Alertmanager upstream instance
type Alertmanager struct {
	URI     string        `json:"uri"`
	Timeout time.Duration `json:"timeout"`
	Name    string        `json:"name"`
	// lock protects data access while updating
	lock sync.RWMutex
	// fields for storing pulled data
	alertGroups  []models.AlertGroup
	silences     map[string]models.Silence
	colors       models.LabelsColorMap
	autocomplete []models.Autocomplete
}

func (am *Alertmanager) detectVersion() string {
	// if everything fails assume Alertmanager is at latest possible version
	defaultVersion := "999.0.0"

	url, err := transport.JoinURL(am.URI, "api/v1/status")
	if err != nil {
		log.Errorf("Failed to join url '%s' and path 'api/v1/status': %s", am.URI, err)
		return defaultVersion
	}
	ver := alertmanagerVersion{}
	err = transport.ReadJSON(url, am.Timeout, &ver)
	if err != nil {
		log.Errorf("[%s] %s request failed: %s", am.Name, url, err.Error())
		return defaultVersion
	}

	if ver.Status != "success" {
		log.Errorf("[%s] Request to %s returned status %s", am.Name, url, ver.Status)
		return defaultVersion
	}

	if ver.Data.VersionInfo.Version == "" {
		log.Errorf("[%s] No version information in Alertmanager API at %s", am.Name, url)
		return defaultVersion
	}

	log.Infof("[%s] Remote Alertmanager version: %s", am.Name, ver.Data.VersionInfo.Version)
	return ver.Data.VersionInfo.Version
}

func (am *Alertmanager) pullSilences(version string) error {
	mapper, err := mapper.GetSilenceMapper(version)
	if err != nil {
		return err
	}

	start := time.Now()
	silences, err := mapper.GetSilences(am.URI, am.Timeout)
	if err != nil {
		return err
	}
	log.Infof("[%s] Got %d silences(s) in %s", am.Name, len(silences), time.Since(start))

	log.Infof("[%s] Detecting JIRA links in silences (%d)", am.Name, len(silences))
	silenceMap := map[string]models.Silence{}
	for _, silence := range silences {
		silence.JiraID, silence.JiraURL = transform.DetectJIRAs(&silence)
		silenceMap[silence.ID] = silence
	}

	am.lock.Lock()
	am.silences = silenceMap
	am.lock.Unlock()

	return nil
}

func (am *Alertmanager) pullAlerts(version string) error {
	mapper, err := mapper.GetAlertMapper(version)
	if err != nil {
		return err
	}

	start := time.Now()
	groups, err := mapper.GetAlerts(am.URI, am.Timeout)
	if err != nil {
		return err
	}
	log.Infof("[%s] Got %d alert group(s) in %s", am.Name, len(groups), time.Since(start))

	log.Infof("[%s] Deduplicating alert groups (%d)", am.Name, len(groups))
	uniqueGroups := map[string]models.AlertGroup{}
	uniqueAlerts := map[string]map[string]models.Alert{}
	for _, ag := range groups {
		agIDHasher := sha1.New()
		io.WriteString(agIDHasher, ag.Receiver)
		io.WriteString(agIDHasher, fmt.Sprintf("%x", structhash.Sha1(ag.Labels, 1)))
		agID := fmt.Sprintf("%x", agIDHasher.Sum(nil))
		if _, found := uniqueGroups[agID]; !found {
			uniqueGroups[agID] = models.AlertGroup{
				Receiver: ag.Receiver,
				Labels:   ag.Labels,
				ID:       agID,
			}
		}
		for _, alert := range ag.Alerts {
			// generate alert id from labels
			aID := fmt.Sprintf("%x", structhash.Sha1(alert.Labels, 1))
			alert.ID = aID
			// generate alert fingerprint from a raw, unaltered alert object
			fp := fmt.Sprintf("%x", structhash.Sha1(alert, 1))
			if _, found := uniqueAlerts[agID]; !found {
				uniqueAlerts[agID] = map[string]models.Alert{}
			}
			if _, found := uniqueAlerts[agID][fp]; !found {
				alert.Fingerprint = fp
				uniqueAlerts[agID][fp] = alert
			}
		}

	}

	dedupedGroups := []models.AlertGroup{}
	colors := models.LabelsColorMap{}
	autocompleteMap := map[string]models.Autocomplete{}
	log.Infof("[%s] Processing unique alert groups (%d)", am.Name, len(uniqueGroups))
	for _, ag := range uniqueGroups {
		alerts := models.AlertList{}
		for _, alert := range uniqueAlerts[ag.ID] {

			silences := map[string]models.Silence{}
			for _, silenceID := range alert.SilencedBy {
				silence, err := am.SilenceByID(silenceID)
				if err == nil {
					silences[silenceID] = silence
				}
			}
			alert.Alertmanager = []models.AlertmanagerUpstream{
				models.AlertmanagerUpstream{
					Name:     am.Name,
					URI:      am.URI,
					Silences: silences,
				},
			}

			alert.Annotations, alert.Links = transform.DetectLinks(alert.Annotations)
			alert.Labels = transform.StripLables(config.Config.StripLabels, alert.Labels)

			transform.ColorLabel(colors, "@receiver", alert.Receiver)
			for k, v := range alert.Labels {
				transform.ColorLabel(colors, k, v)
			}
			alerts = append(alerts, alert)

			// update internal metrics
			metricAlerts.With(prometheus.Labels{
				"alertmanager": am.Name,
				"state":        alert.State,
			}).Inc()
		}

		for _, hint := range transform.BuildAutocomplete(alerts) {
			autocompleteMap[hint.Value] = hint
		}

		sort.Sort(&alerts)
		ag.Alerts = alerts

		// Hash is a checksum of all alerts, used to tell when any alert in the group changed
		ag.Hash = ag.ContentFingerprint()

		dedupedGroups = append(dedupedGroups, ag)
	}

	log.Infof("[%s] Merging autocomplete data (%d)", am.Name, len(autocompleteMap))
	autocomplete := []models.Autocomplete{}
	for _, hint := range autocompleteMap {
		autocomplete = append(autocomplete, hint)
	}

	am.lock.Lock()
	am.alertGroups = dedupedGroups
	am.colors = colors
	am.autocomplete = autocomplete
	am.lock.Unlock()

	metricAlertGroups.With(prometheus.Labels{
		"alertmanager": am.Name,
	}).Set(float64(len(dedupedGroups)))

	return nil
}

// Pull data from upstream Alertmanager instance
func (am *Alertmanager) Pull() error {
	version := am.detectVersion()

	err := am.pullSilences(version)
	if err != nil {
		metricAlertmanagerErrors.With(prometheus.Labels{
			"alertmanager": am.Name,
			"endpoint":     "silences",
		}).Inc()
		return err
	}

	err = am.pullAlerts(version)
	if err != nil {
		metricAlertmanagerErrors.With(prometheus.Labels{
			"alertmanager": am.Name,
			"endpoint":     "alerts",
		}).Inc()
		return err
	}

	return nil
}

// Alerts returns a copy of all alert groups
func (am *Alertmanager) Alerts() []models.AlertGroup {
	am.lock.RLock()
	defer am.lock.RUnlock()

	alerts := make([]models.AlertGroup, len(am.alertGroups))
	copy(alerts, am.alertGroups)
	return alerts
}

// SilenceByID allows to query for a silence by it's ID, returns error if not found
func (am *Alertmanager) SilenceByID(id string) (models.Silence, error) {
	am.lock.RLock()
	defer am.lock.RUnlock()

	for k, v := range am.silences {
		if k == id {
			return models.Silence(v), nil
		}
	}

	return models.Silence{}, fmt.Errorf("Silence '%s' not found", id)
}

// Colors returns a copy of all color maps
func (am *Alertmanager) Colors() models.LabelsColorMap {
	am.lock.RLock()
	defer am.lock.RUnlock()

	colors := models.LabelsColorMap{}
	for k, v := range am.colors {
		colors[k] = map[string]models.LabelColors{}
		for nk, nv := range v {
			colors[k][nk] = nv
		}
	}
	return colors
}

// Autocomplete returns a copy of all autocomplete data
func (am *Alertmanager) Autocomplete() []models.Autocomplete {
	am.lock.RLock()
	defer am.lock.RUnlock()

	autocomplete := make([]models.Autocomplete, len(am.autocomplete))
	copy(autocomplete, am.autocomplete)
	return autocomplete
}
