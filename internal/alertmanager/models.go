package alertmanager

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/cloudflare/unsee/internal/mapper"
	"github.com/cloudflare/unsee/internal/models"
	"github.com/cloudflare/unsee/internal/transform"
	"github.com/cloudflare/unsee/internal/transport"

	log "github.com/sirupsen/logrus"
)

const (
	labelValueErrorsAlerts   = "alerts"
	labelValueErrorsSilences = "silences"
)

type alertmanagerMetrics struct {
	cycles float64
	errors map[string]float64
}

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
	lastError    string
	// metrics tracked per alertmanager instance
	metrics alertmanagerMetrics
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

func (am *Alertmanager) clearData() {
	am.lock.Lock()
	am.alertGroups = []models.AlertGroup{}
	am.silences = map[string]models.Silence{}
	am.colors = models.LabelsColorMap{}
	am.autocomplete = []models.Autocomplete{}
	am.lock.Unlock()
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
		agID := ag.LabelsFingerprint()
		if _, found := uniqueGroups[agID]; !found {
			uniqueGroups[agID] = models.AlertGroup{
				Receiver: ag.Receiver,
				Labels:   ag.Labels,
				ID:       agID,
			}
		}
		for _, alert := range ag.Alerts {
			if _, found := uniqueAlerts[agID]; !found {
				uniqueAlerts[agID] = map[string]models.Alert{}
			}
			alertCFP := alert.ContentFingerprint()
			if _, found := uniqueAlerts[agID][alertCFP]; !found {
				uniqueAlerts[agID][alertCFP] = alert
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
			alert.Alertmanager = []models.AlertmanagerInstance{
				models.AlertmanagerInstance{
					Name:     am.Name,
					URI:      am.URI,
					State:    alert.State,
					StartsAt: alert.StartsAt,
					EndsAt:   alert.EndsAt,
					Source:   alert.GeneratorURL,
					Silences: silences,
				},
			}

			transform.ColorLabel(colors, "@receiver", alert.Receiver)
			for k, v := range alert.Labels {
				transform.ColorLabel(colors, k, v)
			}

			alert.UpdateFingerprints()
			alerts = append(alerts, alert)
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

	return nil
}

// Pull data from upstream Alertmanager instance
func (am *Alertmanager) Pull() error {
	am.metrics.cycles++

	version := am.detectVersion()

	err := am.pullSilences(version)
	if err != nil {
		am.clearData()
		am.setError(err.Error())
		am.metrics.errors[labelValueErrorsSilences]++
		return err
	}

	err = am.pullAlerts(version)
	if err != nil {
		am.clearData()
		am.setError(err.Error())
		am.metrics.errors[labelValueErrorsAlerts]++
		return err
	}

	am.lastError = ""
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

	s, found := am.silences[id]
	if !found {
		return models.Silence{}, fmt.Errorf("Silence '%s' not found", id)
	}
	return s, nil
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

func (am *Alertmanager) setError(err string) {
	am.lock.Lock()
	defer am.lock.Unlock()

	am.lastError = err
}

func (am *Alertmanager) Error() string {
	am.lock.RLock()
	defer am.lock.RUnlock()

	return am.lastError
}
