package alertmanager

import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"
	"github.com/prymitive/karma/internal/verprobe"

	"github.com/rs/zerolog/log"
)

const (
	labelValueErrorsAlerts   = "alerts"
	labelValueErrorsSilences = "silences"
)

type alertmanagerMetrics struct {
	Cycles float64
	Errors map[string]float64
}

type healthCheck struct {
	filters  []filters.FilterT
	wasFound bool
}

// Alertmanager represents Alertmanager upstream instance
type Alertmanager struct {
	URI            string        `json:"uri"`
	ExternalURI    string        `json:"-"`
	RequestTimeout time.Duration `json:"timeout"`
	Cluster        string        `json:"cluster"`
	Name           string        `json:"name"`
	// whenever this instance should be proxied
	ProxyRequests bool `json:"proxyRequests"`
	ReadOnly      bool `json:"readonly"`
	// reader instances are specific to URI scheme we collect from
	reader uri.Reader
	// implements how we fetch requests from the Alertmanager, we don't set it
	// by default so it's nil and http.DefaultTransport is used
	HTTPTransport http.RoundTripper `json:"-"`
	// lock protects data access while updating
	lock sync.RWMutex
	// fields for storing pulled data
	alertGroups      []models.AlertGroup
	silences         map[string]models.Silence
	colors           models.LabelsColorMap
	autocomplete     []models.Autocomplete
	knownLabels      []string
	lastError        string
	lastVersionProbe string
	status           models.AlertmanagerStatus
	clusterName      string
	// metrics tracked per alertmanager instance
	Metrics alertmanagerMetrics
	// headers to send with each AlertManager request
	HTTPHeaders map[string]string
	// CORS credentials
	CORSCredentials     string `json:"corsCredentials"`
	healthchecks        map[string]healthCheck
	healthchecksVisible bool
}

func (am *Alertmanager) probeVersion() string {
	url, err := uri.JoinURL(am.URI, "metrics")
	if err != nil {
		log.Error().
			Err(err).
			Str("uri", am.SanitizedURI()).
			Msg("Failed to join url with /metrics path")
		return ""
	}

	source, err := am.reader.Read(url, am.HTTPHeaders)
	if err != nil {
		log.Error().
			Err(err).
			Str("alertmanager", am.Name).
			Str("uri", am.SanitizedURI()).
			Msg("Request failed")
		return ""
	}
	defer source.Close()

	version, err := verprobe.Detect(source)
	if err != nil {
		log.Error().Err(err).Str("alertmanager", am.Name).Msg("Error while discovering version")
		return ""
	}
	log.Info().
		Str("version", version).
		Str("alertmanager", am.Name).
		Msg("Upstream version")

	return version
}

func (am *Alertmanager) fetchStatus(version string) (*models.AlertmanagerStatus, error) {
	mapper, err := mapper.GetStatusMapper(version)
	if err != nil {
		return nil, err
	}

	var status models.AlertmanagerStatus

	status, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
	if err != nil {
		return nil, err
	}

	return &status, nil
}

func (am *Alertmanager) clearData() {
	am.lock.Lock()
	am.alertGroups = []models.AlertGroup{}
	am.silences = map[string]models.Silence{}
	am.colors = models.LabelsColorMap{}
	am.autocomplete = []models.Autocomplete{}
	am.knownLabels = []string{}
	am.lock.Unlock()
}

func (am *Alertmanager) clearStatus() {
	am.lock.Lock()
	am.status = models.AlertmanagerStatus{
		ID:      "",
		PeerIDs: []string{},
	}
	am.lock.Unlock()
}

func (am *Alertmanager) pullSilences(version string) error {
	mapper, err := mapper.GetSilenceMapper(version)
	if err != nil {
		return err
	}

	var silences []models.Silence

	start := time.Now()
	silences, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
	if err != nil {
		return err
	}
	log.Info().
		Str("alertmanager", am.Name).
		Int("silences", len(silences)).
		Dur("duration", time.Since(start)).
		Msg("Got silences")

	log.Info().
		Str("alertmanager", am.Name).
		Int("silences", len(silences)).
		Msg("Detecting ticket links in silences")
	silenceMap := make(map[string]models.Silence, len(silences))
	for _, silence := range silences {
		silence := silence // scopelint pin
		silence.TicketID, silence.TicketURL = transform.DetectLinks(&silence)
		silenceMap[silence.ID] = silence
	}

	am.lock.Lock()
	am.silences = silenceMap
	am.lock.Unlock()

	return nil
}

// InternalURI is the URI of this Alertmanager that will be used for all request made by the UI
func (am *Alertmanager) InternalURI() string {
	if am.ProxyRequests {
		return fmt.Sprintf("./proxy/alertmanager/%s", am.Name)
	}

	// strip all user/pass information, fetch() doesn't support it anyway
	return uri.WithoutUserinfo(am.PublicURI())
}

// PublicURI is the URI of this Alertmanager that will be used for browser links
func (am *Alertmanager) PublicURI() string {
	// external_uri is always the first setting to check for browser links
	if am.ExternalURI != "" {
		return am.ExternalURI
	}

	return am.URI
}

func (am *Alertmanager) pullAlerts(version string) error {
	mapper, err := mapper.GetAlertMapper(version)
	if err != nil {
		return err
	}

	healthchecks := map[string]healthCheck{}
	am.lock.RLock()
	for name, hc := range am.healthchecks {
		healthchecks[name] = healthCheck{
			filters:  hc.filters,
			wasFound: false,
		}
	}
	am.lock.RUnlock()

	var groups []models.AlertGroup

	start := time.Now()
	groups, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
	if err != nil {
		return err
	}
	log.Info().
		Str("alertmanager", am.Name).
		Int("groups", len(groups)).
		Dur("duration", time.Since((start))).
		Msg("Collected alert groups")

	log.Info().
		Str("alertmanager", am.Name).
		Int("groups", len(groups)).
		Msg("Deduplicating alert groups")
	uniqueGroups := map[string]models.AlertGroup{}
	uniqueAlerts := map[string]map[string]models.Alert{}
	knownLabelsMap := map[string]bool{}
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
			alert := alert

			if _, found := uniqueAlerts[agID]; !found {
				uniqueAlerts[agID] = map[string]models.Alert{}
			}
			alertCFP := alert.ContentFingerprint()
			if _, found := uniqueAlerts[agID][alertCFP]; !found {
				uniqueAlerts[agID][alertCFP] = alert
			}
			for key := range alert.Labels {
				knownLabelsMap[key] = true
			}

			if name, hc := am.IsHealthCheckAlert(&alert); hc != nil {
				healthchecks[name] = healthCheck{
					filters:  hc.filters,
					wasFound: true,
				}
			}
		}
	}

	dedupedGroups := make([]models.AlertGroup, 0, len(uniqueGroups))
	colors := models.LabelsColorMap{}
	autocompleteMap := map[string]models.Autocomplete{}

	log.Info().
		Str("alertmanager", am.Name).
		Int("groups", len(uniqueGroups)).
		Msg("Processing deduplicated alert groups")
	for _, ag := range uniqueGroups {
		alerts := make(models.AlertList, 0, len(uniqueAlerts[ag.ID]))
		for _, alert := range uniqueAlerts[ag.ID] {
			alert := alert
			silences := map[string]*models.Silence{}
			for _, silenceID := range alert.SilencedBy {
				silence, err := am.SilenceByID(silenceID)
				if err == nil {
					silences[silenceID] = &silence
				}
			}

			alert.Alertmanager = []models.AlertmanagerInstance{
				{
					Fingerprint: alert.Fingerprint,
					Name:        am.Name,
					Cluster:     am.ClusterName(),
					State:       alert.State,
					StartsAt:    alert.StartsAt,
					Source:      alert.GeneratorURL,
					Silences:    silences,
					SilencedBy:  alert.SilencedBy,
					InhibitedBy: alert.InhibitedBy,
				},
			}

			transform.ColorLabel(colors, "@receiver", alert.Receiver)
			for _, am := range alert.Alertmanager {
				transform.ColorLabel(colors, "@alertmanager", am.Name)
				transform.ColorLabel(colors, "@cluster", am.Cluster)
			}
			for k, v := range alert.Labels {
				transform.ColorLabel(colors, k, v)
			}

			alert.UpdateFingerprints()
			alerts = append(alerts, alert)
		}

		for _, hint := range filters.BuildAutocomplete(alerts) {
			autocompleteMap[hint.Value] = hint
		}

		sort.Sort(&alerts)
		ag.Alerts = alerts

		// Hash is a checksum of all alerts, used to tell when any alert in the group changed
		ag.Hash = ag.ContentFingerprint()

		dedupedGroups = append(dedupedGroups, ag)
	}

	log.Info().
		Str("alertmanager", am.Name).
		Int("hints", len(autocompleteMap)).
		Msg("Merging autocomplete hints")
	autocomplete := make([]models.Autocomplete, 0, len(autocompleteMap))
	for _, hint := range autocompleteMap {
		autocomplete = append(autocomplete, hint)
	}

	knownLabels := make([]string, 0, len(knownLabelsMap))
	for key := range knownLabelsMap {
		knownLabels = append(knownLabels, key)
	}

	am.lock.Lock()
	am.alertGroups = dedupedGroups
	am.colors = colors
	am.autocomplete = autocomplete
	am.knownLabels = knownLabels
	am.healthchecks = healthchecks
	am.lock.Unlock()

	return nil
}

// Pull data from upstream Alertmanager instance
func (am *Alertmanager) Pull() error {
	am.Metrics.Cycles++

	version := am.probeVersion()
	am.lock.Lock()
	am.lastVersionProbe = version
	am.lock.Unlock()

	log.Debug().Str("alertmanager", am.Name).Str("version", version).Msg("Probed alertmanager version")

	// verify that URI is correct
	_, err := url.Parse(am.URI)
	if err != nil {
		return err
	}

	status, err := am.fetchStatus(version)
	if err != nil {
		am.clearData()
		am.clearStatus()
		am.setError(err.Error())
		am.Metrics.Errors[labelValueErrorsSilences]++
		return err
	}
	am.lock.Lock()
	am.status = *status
	am.lock.Unlock()

	err = am.pullSilences(version)
	if err != nil {
		am.clearData()
		am.setError(err.Error())
		am.Metrics.Errors[labelValueErrorsSilences]++
		return err
	}

	err = am.pullAlerts(version)
	if err != nil {
		am.clearData()
		am.setError(err.Error())
		am.Metrics.Errors[labelValueErrorsAlerts]++
		return err
	}

	am.lock.Lock()
	am.lastError = ""
	am.clusterName = ""
	am.lock.Unlock()

	for name, hc := range am.healthchecks {
		if !hc.wasFound {
			am.setError(fmt.Sprintf("Healthcheck filter %q didn't match any alerts", name))
		}
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

// Silences returns a copy of all silences
func (am *Alertmanager) Silences() map[string]models.Silence {
	am.lock.RLock()
	defer am.lock.RUnlock()

	silences := make(map[string]models.Silence, len(am.silences))
	for id, silence := range am.silences {
		silences[id] = silence
	}
	return silences
}

// SilenceByID allows to query for a silence by it's ID, returns error if not found
func (am *Alertmanager) SilenceByID(id string) (models.Silence, error) {
	am.lock.RLock()
	defer am.lock.RUnlock()

	s, found := am.silences[id]
	if !found {
		return models.Silence{}, fmt.Errorf("silence '%s' not found", id)
	}
	return s, nil
}

// Colors returns a copy of all color maps
func (am *Alertmanager) Colors() models.LabelsColorMap {
	am.lock.RLock()
	defer am.lock.RUnlock()

	colors := make(models.LabelsColorMap, len(am.colors))
	for k, v := range am.colors {
		colors[k] = make(map[string]models.LabelColors, len(v))
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

// KnownLabels returns a copy of a map with known labels
func (am *Alertmanager) KnownLabels() []string {
	am.lock.RLock()
	defer am.lock.RUnlock()

	knownLabels := make([]string, len(am.knownLabels))
	copy(knownLabels, am.knownLabels)

	return knownLabels
}

func (am *Alertmanager) setError(err string) {
	am.lock.Lock()
	defer am.lock.Unlock()

	am.lastError = err
}

func (am *Alertmanager) getLastError() string {
	am.lock.RLock()
	defer am.lock.RUnlock()
	return am.lastError
}

func (am *Alertmanager) Error() string {
	lastError := am.getLastError()
	if lastError != "" {
		return lastError
	}

	configPeers := clusterMembersFromConfig(am)
	apiPeers := clusterMembersFromAPI(am)
	missing, _ := slices.StringSliceDiff(configPeers, apiPeers)

	if len(missing) > 0 {
		log.Debug().
			Str("alertmanager", am.Name).
			Strs("configured", configPeers).
			Strs("api", apiPeers).
			Strs("missing", missing).
			Msg("Cluster peers mismatch")
		return fmt.Sprintf("missing cluster peers: %s", strings.Join(missing, ", "))
	}

	return ""
}

// SanitizedURI returns a copy of Alertmanager.URI with password replaced by
// "xxx"
func (am *Alertmanager) SanitizedURI() string {
	return uri.SanitizeURI(am.URI)
}

// Version returns last known version of this Alertmanager instance
func (am *Alertmanager) Version() string {
	am.lock.RLock()
	defer am.lock.RUnlock()

	return am.lastVersionProbe
}

// ClusterPeers returns a list of IDs of all peers this instance
// is connected to.
// IDs are the same as in Alertmanager API.
func (am *Alertmanager) ClusterPeers() []string {
	am.lock.RLock()
	defer am.lock.RUnlock()

	return am.status.PeerIDs
}

// ClusterMemberNames returns a list of names of all Alertmanager instances
// that are in the same cluster as this instance (including self).
// Names are the same as in karma configuration.
func (am *Alertmanager) ClusterMemberNames() []string {
	// copy status so we don't need to hold RLock until return
	status := models.AlertmanagerStatus{}
	am.lock.RLock()
	status.ID = am.status.ID
	copy(am.status.PeerIDs, status.PeerIDs)
	am.lock.RUnlock()

	members := []string{am.Name}

	upstreams := GetAlertmanagers()
	for _, upstream := range upstreams {
		// skip self, it's already part of members slice
		if upstream.Name == am.Name {
			continue
		}
		for _, peerID := range upstream.ClusterPeers() {
			// IF
			// other alertmanagers peerID is in this alertmanager cluster status
			// OR
			// this alertmanager peerID is in other alertmanagers cluster status
			if slices.StringInSlice(status.PeerIDs, peerID) || peerID == status.ID {
				if !slices.StringInSlice(members, upstream.Name) {
					members = append(members, upstream.Name)
				}
			}
		}
	}

	sort.Strings(members)
	return members
}

func (am *Alertmanager) ClusterName() string {
	am.lock.RLock()
	if am.clusterName != "" {
		am.lock.RUnlock()
		return am.clusterName
	}
	am.lock.RUnlock()

	var clusterName string
	if am.Cluster != "" {
		clusterName = am.Cluster
	} else {
		clusterName = strings.Join(am.ClusterMemberNames(), " | ")
	}
	am.clusterName = clusterName
	return clusterName
}

func (am *Alertmanager) IsHealthy() bool {
	lastError := am.getLastError()
	return lastError == ""
}

func (am *Alertmanager) IsHealthCheckAlert(alert *models.Alert) (string, *healthCheck) {
	for name, hc := range am.healthchecks {
		hc := hc
		positiveMatch := false
		negativeMatch := false
		for _, hcFilter := range hc.filters {
			if hcFilter.Match(alert, 0) {
				log.Debug().
					Str("alertmanager", am.Name).
					Str("healthcheck", name).
					Msg("Healthcheck alert matched")
				positiveMatch = true
			} else {
				negativeMatch = true
			}
		}
		if positiveMatch && !negativeMatch {
			return name, &hc
		}
	}
	return "", nil
}
