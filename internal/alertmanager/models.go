package alertmanager

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"
	"github.com/prymitive/karma/internal/verprobe"

	log "github.com/sirupsen/logrus"
)

const (
	labelValueErrorsAlerts   = "alerts"
	labelValueErrorsSilences = "silences"
)

type alertmanagerMetrics struct {
	Cycles float64
	Errors map[string]float64
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
	alertGroups  []models.AlertGroup
	silences     map[string]models.Silence
	colors       models.LabelsColorMap
	autocomplete []models.Autocomplete
	knownLabels  []string
	lastError    string
	status       models.AlertmanagerStatus
	clusterName  string
	// metrics tracked per alertmanager instance
	Metrics alertmanagerMetrics
	// headers to send with each AlertManager request
	HTTPHeaders map[string]string
	// CORS credentials
	CORSCredentials string `json:"corsCredentials"`
}

func (am *Alertmanager) probeVersion() string {
	const fakeVersion = "999.0.0"

	url, err := uri.JoinURL(am.URI, "metrics")
	if err != nil {
		log.Errorf("Failed to join url '%s' and path 'metrics': %s", am.SanitizedURI(), err)
		return fakeVersion
	}

	source, err := am.reader.Read(url, am.HTTPHeaders)
	if err != nil {
		log.Errorf("[%s] %s request failed: %s", am.Name, uri.SanitizeURI(url), err)
		return fakeVersion
	}
	defer source.Close()

	version, err := verprobe.Detect(source)
	if err != nil {
		return fakeVersion
	}
	log.Infof("[%s] Upstream version: %s", am.Name, version)

	if version == "0.17.0" || version == "0.18.0" {
		log.Warningf("Alertmanager %s might return incomplete list of alert groups in the API, please upgrade to >=0.19.0, see https://github.com/prymitive/karma/issues/812", version)
	}

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
	am.status = models.AlertmanagerStatus{
		Version: "",
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
	log.Infof("[%s] Got %d silences(s) in %s", am.Name, len(silences), time.Since(start))

	log.Infof("[%s] Detecting ticket links in silences (%d)", am.Name, len(silences))
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
		sub := fmt.Sprintf("/proxy/alertmanager/%s", am.Name)
		if strings.HasPrefix(config.Config.Listen.Prefix, "/") {
			return path.Join(config.Config.Listen.Prefix, sub)
		}
		return path.Join("/"+config.Config.Listen.Prefix, sub)
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

	var groups []models.AlertGroup

	start := time.Now()

	groups, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
	if err != nil {
		return err
	}

	log.Infof("[%s] Got %d alert group(s) in %s", am.Name, len(groups), time.Since(start))

	log.Infof("[%s] Deduplicating alert groups (%d)", am.Name, len(groups))
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
		}

	}

	dedupedGroups := make([]models.AlertGroup, 0, len(uniqueGroups))
	colors := models.LabelsColorMap{}
	autocompleteMap := map[string]models.Autocomplete{}

	log.Infof("[%s] Processing unique alert groups (%d)", am.Name, len(uniqueGroups))
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

	log.Infof("[%s] Merging autocomplete data (%d)", am.Name, len(autocompleteMap))
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
	am.lock.Unlock()

	return nil
}

// Pull data from upstream Alertmanager instance
func (am *Alertmanager) Pull() error {
	am.Metrics.Cycles++

	version := am.probeVersion()

	// verify that URI is correct
	_, err := url.Parse(am.URI)
	if err != nil {
		return err
	}

	status, err := am.fetchStatus(version)
	if err != nil {
		am.clearData()
		am.setError(err.Error())
		am.Metrics.Errors[labelValueErrorsSilences]++
		return err
	}

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
	am.status = *status
	am.lastError = ""
	am.clusterName = ""
	am.lock.Unlock()

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

func (am *Alertmanager) Error() string {
	am.lock.RLock()
	defer am.lock.RUnlock()

	return am.lastError
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

	return am.status.Version
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
	am.lock.RLock()
	defer am.lock.RUnlock()

	members := []string{am.Name}

	upstreams := GetAlertmanagers()
	for _, upstream := range upstreams {
		if upstream.Name == am.Name {
			continue
		}
		for _, peerID := range upstream.ClusterPeers() {
			if slices.StringInSlice(am.status.PeerIDs, peerID) {
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
		configPeers := clusterMembersFromConfig(am)
		apiPeers := clusterMembersFromAPI(am)
		missing, extra := slices.StringSliceDiff(configPeers, apiPeers)

		if len(missing) == 0 && len(extra) == 0 {
			clusterName = am.Cluster
		} else {
			clusterName = strings.Join(am.ClusterMemberNames(), " | ")
		}
	} else {
		clusterName = strings.Join(am.ClusterMemberNames(), " | ")
	}
	am.clusterName = clusterName
	return clusterName
}
