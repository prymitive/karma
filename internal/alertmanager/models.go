package alertmanager

import (
	"fmt"
	"net/http"
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
	Name           string        `json:"name"`
	// whenever this instance should be proxied
	ProxyRequests bool `json:"proxyRequests"`
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
	// metrics tracked per alertmanager instance
	Metrics alertmanagerMetrics
	// headers to send with each AlertManager request
	HTTPHeaders map[string]string
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

	return version
}

func (am *Alertmanager) fetchStatus(version string) (*models.AlertmanagerStatus, error) {
	mapper, err := mapper.GetStatusMapper(version)
	if err != nil {
		return nil, err
	}

	var status models.AlertmanagerStatus

	if mapper.IsOpenAPI() {
		status, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
		if err != nil {
			return nil, err
		}
	} else {
		// generate full URL to collect silences from
		url, err := mapper.AbsoluteURL(am.URI)
		if err != nil {
			log.Errorf("[%s] Failed to generate status endpoint URL: %s", am.Name, err)
			return nil, err
		}
		// read raw body from the source
		source, err := am.reader.Read(url, am.HTTPHeaders)
		if err != nil {
			log.Errorf("[%s] %s request failed: %s", am.Name, uri.SanitizeURI(url), err)
			return nil, err
		}
		defer source.Close()

		// decode body text
		status, err = mapper.Decode(source)
		if err != nil {
			return nil, err
		}
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
	if mapper.IsOpenAPI() {
		silences, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
		if err != nil {
			return err
		}
	} else {
		// generate full URL to collect silences from
		url, err := mapper.AbsoluteURL(am.URI)
		if err != nil {
			log.Errorf("[%s] Failed to generate silences endpoint URL: %s", am.Name, err)
			return err
		}
		// append query args if mapper needs those
		queryArgs := mapper.QueryArgs()
		if queryArgs != "" {
			url = fmt.Sprintf("%s?%s", url, queryArgs)
		}

		// read raw body from the source
		source, err := am.reader.Read(url, am.HTTPHeaders)
		if err != nil {
			log.Errorf("[%s] %s request failed: %s", am.Name, uri.SanitizeURI(url), err)
			return err
		}
		defer source.Close()

		// decode body text
		silences, err = mapper.Decode(source)
		if err != nil {
			return err
		}
	}
	log.Infof("[%s] Got %d silences(s) in %s", am.Name, len(silences), time.Since(start))

	log.Infof("[%s] Detecting JIRA links in silences (%d)", am.Name, len(silences))
	silenceMap := map[string]models.Silence{}
	for _, silence := range silences {
		silence := silence // scopelint pin
		silence.JiraID, silence.JiraURL = transform.DetectJIRAs(&silence)
		silenceMap[silence.ID] = silence
	}

	am.lock.Lock()
	am.silences = silenceMap
	am.lock.Unlock()

	return nil
}

// PublicURI is the URI of this Alertmanager we put in JSON response
// it's either real full URI or a proxy relative URI
func (am *Alertmanager) PublicURI() string {
	if am.ProxyRequests {
		sub := fmt.Sprintf("/proxy/alertmanager/%s", am.Name)
		uri := path.Join(config.Config.Listen.Prefix, sub)
		if strings.HasSuffix(sub, "/") {
			// if sub path had trailing slash then add it here, since path.Join will
			// skip it
			return uri + "/"
		}
		return uri
	}
	if am.ExternalURI != "" {
		return am.ExternalURI
	}
	return uri.WithoutUserinfo(am.URI)
}

func (am *Alertmanager) pullAlerts(version string) error {
	mapper, err := mapper.GetAlertMapper(version)
	if err != nil {
		return err
	}

	var groups []models.AlertGroup

	start := time.Now()
	if mapper.IsOpenAPI() {
		groups, err = mapper.Collect(am.URI, am.HTTPHeaders, am.RequestTimeout, am.HTTPTransport)
		if err != nil {
			return err
		}
	} else {

		// generate full URL to collect alerts from
		url, err := mapper.AbsoluteURL(am.URI)
		if err != nil {
			log.Errorf("[%s] Failed to generate alerts endpoint URL: %s", am.Name, err)
			return err
		}

		// append query args if mapper needs those
		queryArgs := mapper.QueryArgs()
		if queryArgs != "" {
			url = fmt.Sprintf("%s?%s", url, queryArgs)
		}

		// read raw body from the source
		source, err := am.reader.Read(url, am.HTTPHeaders)
		if err != nil {
			log.Errorf("[%s] %s request failed: %s", am.Name, uri.SanitizeURI(url), err)
			return err
		}
		defer source.Close()

		// decode body text
		groups, err = mapper.Decode(source)
		if err != nil {
			return err
		}
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

	dedupedGroups := []models.AlertGroup{}
	colors := models.LabelsColorMap{}
	autocompleteMap := map[string]models.Autocomplete{}

	log.Infof("[%s] Processing unique alert groups (%d)", am.Name, len(uniqueGroups))
	for _, ag := range uniqueGroups {
		alerts := models.AlertList{}
		for _, alert := range uniqueAlerts[ag.ID] {

			silences := map[string]*models.Silence{}
			for _, silenceID := range alert.SilencedBy {
				silence, err := am.SilenceByID(silenceID)
				if err == nil {
					silences[silenceID] = &silence
				}
			}

			alert.Alertmanager = []models.AlertmanagerInstance{
				{
					Name:        am.Name,
					Cluster:     am.ClusterID(),
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
	autocomplete := []models.Autocomplete{}
	for _, hint := range autocompleteMap {
		autocomplete = append(autocomplete, hint)
	}

	knownLabels := []string{}
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

	silences := map[string]models.Silence{}
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
	am.lock.RLock()
	defer am.lock.RUnlock()

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

// ClusterID returns the ID (sha1) of the cluster this Alertmanager instance
// belongs to
func (am *Alertmanager) ClusterID() string {
	members := am.ClusterMemberNames()
	id, err := slices.StringSliceToSHA1(members)
	if err != nil {
		log.Errorf("slices.StringSliceToSHA1 error: %s", err)
		return am.Name
	}
	return id
}
