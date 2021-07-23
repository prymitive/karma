package main

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/cnf/structhash"
	"github.com/fvbommel/sortorder"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/transform"

	"github.com/rs/zerolog/log"
)

func noCache(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
}

func mimeJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

func badRequestJSON(w http.ResponseWriter, error string) {
	mimeJSON(w)
	w.WriteHeader(http.StatusBadRequest)
	out, _ := json.Marshal(map[string]string{"error": error})
	_, _ = w.Write(out)
}

type KarmaVersion struct {
	Version string `json:"version"`
	Golang  string `json:"golang"`
}

func versionHandler(w http.ResponseWriter, r *http.Request) {
	ver := KarmaVersion{
		Version: version,
		Golang:  runtime.Version(),
	}
	data, _ := json.MarshalIndent(ver, "", "  ")
	_, _ = w.Write(data)
}

func pong(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte("Pong\n"))
}

func robots(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte("User-agent: *\nDisallow: /\n"))
}

func compressResponse(data []byte, gz io.WriteCloser) ([]byte, error) {
	var b bytes.Buffer

	if gz == nil {
		// this only fails if we pass unsupported level (3 is valid)
		gz, _ = gzip.NewWriterLevel(&b, 3)
	}

	_, err := gz.Write(data)
	if err != nil {
		return nil, fmt.Errorf("failed to compress data: %s", err.Error())
	}

	if err = gz.Close(); err != nil {
		return nil, fmt.Errorf("failed to close compression writer: %s", err.Error())
	}

	compressed := b.Bytes()
	ratio := fmt.Sprintf("%.5f", float64(len(compressed))/float64(len(data)))
	log.Debug().
		Int("original", len(data)).
		Int("compressed", len(compressed)).
		Str("ratio", ratio).
		Msg("Compressed response")

	return compressed, nil
}

func decompressCachedResponse(r io.Reader) ([]byte, error) {
	z, err := gzip.NewReader(r)
	if err != nil {
		return nil, fmt.Errorf("failed to created new compression reader: %s", err.Error())
	}
	p, err := io.ReadAll(z)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress data: %s", err.Error())
	}
	z.Close()
	return p, nil
}

func pushPath(w http.ResponseWriter, path string) {
	if pusher, ok := w.(http.Pusher); ok {
		if err := pusher.Push(path, nil); err != nil {
			log.Debug().Err(err).Str("path", path).Msg("Failed to push server path via HTTP/2")
		}
	}
}

func redirectIndex(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, r.URL.Path+"/", http.StatusMovedPermanently)
}

func index(w http.ResponseWriter, r *http.Request) {
	noCache(w)
	pushPath(w, getViewURL("/custom.css"))
	pushPath(w, getViewURL("/custom.js"))

	filtersJSON, _ := json.Marshal(config.Config.Filters.Default)
	filtersB64 := base64.StdEncoding.EncodeToString(filtersJSON)

	defaults, _ := json.Marshal(config.Config.UI)
	defaultsB64 := base64.StdEncoding.EncodeToString(defaults)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = indexTemplate.Execute(w, map[string]string{
		"KarmaName":     config.Config.Karma.Name,
		"Version":       version,
		"SentryDSN":     config.Config.Sentry.Public,
		"DefaultFilter": filtersB64,
		"Defaults":      defaultsB64,
		"CustomCSS":     config.Config.Custom.CSS,
		"CustomJS":      config.Config.Custom.JS,
	})
}

func populateAPIFilters(matchFilters []filters.FilterT) []models.Filter {
	apiFilters := []models.Filter{}
	for _, filter := range matchFilters {
		af := models.Filter{
			Text:    filter.GetRawText(),
			Name:    filter.GetName(),
			Matcher: filter.GetMatcher(),
			Value:   filter.GetValue(),
			Hits:    filter.GetHits(),
			IsValid: filter.GetIsValid(),
		}
		if af.Text != "" {
			apiFilters = append(apiFilters, af)
		}
	}
	return apiFilters
}

// alerts endpoint, json, JS will query this via AJAX call
func alerts(w http.ResponseWriter, r *http.Request) {
	noCache(w)
	start := time.Now()
	ts, _ := start.UTC().MarshalText()

	var username string
	if config.Config.Authentication.Enabled {
		username = getUserFromContext(r)
	}

	upstreams := getUpstreams()

	// initialize response object, set fields that don't require any locking
	resp := models.AlertsResponse{}
	resp.Status = "success"
	resp.Timestamp = string(ts)
	resp.Version = version
	resp.Upstreams = upstreams
	resp.Settings = models.Settings{
		Sorting: models.SortSettings{
			Grid: models.GridSettings{
				Order:   config.Config.Grid.Sorting.Order,
				Reverse: config.Config.Grid.Sorting.Reverse,
				Label:   config.Config.Grid.Sorting.Label,
			},
			ValueMapping: map[string]map[string]string{},
		},
		StaticColorLabels:        config.Config.Labels.Color.Static,
		ValueOnlyLabels:          config.Config.Labels.ValueOnly,
		AnnotationsDefaultHidden: config.Config.Annotations.Default.Hidden,
		AnnotationsHidden:        config.Config.Annotations.Hidden,
		AnnotationsVisible:       config.Config.Annotations.Visible,
		AnnotationsAllowHTML:     config.Config.Annotations.EnableInsecureHTML,
		SilenceForm: models.SilenceFormSettings{
			Strip: models.SilenceFormStripSettings{
				Labels: config.Config.SilenceForm.Strip.Labels,
			},
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         config.Config.AlertAcknowledgement.Enabled,
			DurationSeconds: int(config.Config.AlertAcknowledgement.Duration.Seconds()),
			Author:          config.Config.AlertAcknowledgement.Author,
			Comment:         config.Config.AlertAcknowledgement.Comment,
		},
		HistoryEnabled: config.Config.History.Enabled,
		GridGroupLimit: config.Config.Grid.GroupLimit,
	}
	resp.Authentication = models.AuthenticationInfo{
		Enabled:  config.Config.Authentication.Enabled,
		Username: username,
	}

	if config.Config.Grid.Sorting.CustomValues.Labels != nil {
		resp.Settings.Sorting.ValueMapping = config.Config.Grid.Sorting.CustomValues.Labels
	}

	var request models.AlertsRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// use full URI (including query args) as cache key
	cacheKey := fmt.Sprintf("%x", structhash.Sha1(request, 1))

	data, found := apiCache.Get(cacheKey)
	if found {
		r := bytes.NewReader(data.([]byte))
		rawData, _ := decompressCachedResponse(r)
		// need to overwrite settings as they can have user specific data
		newResp := models.AlertsResponse{}
		_ = json.Unmarshal(rawData, &newResp)
		newResp.Settings = resp.Settings
		newResp.Timestamp = string(ts)
		newResp.Authentication = resp.Authentication
		newData, _ := json.Marshal(&newResp)
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(newData)
		return
	}

	matchFilters := getFiltersFromQuery(request.Filters)

	grids := map[string]models.APIGrid{}
	colors := models.LabelsColorMap{}

	dedupedAlerts := alertmanager.DedupAlerts()
	dedupedColors := alertmanager.DedupColors()

	silences := map[string]map[string]models.Silence{}
	for _, am := range alertmanager.GetAlertmanagers() {
		key := am.ClusterName()
		if _, found := silences[key]; !found {
			silences[key] = map[string]models.Silence{}
		}
	}

	allReceivers := map[string]bool{}

	filtered := filterAlerts(dedupedAlerts, matchFilters)

	gridLabel := request.GridLabel
	if gridLabel == "@auto" {
		gridLabel = autoGridLabel(filtered)
		log.Debug().Str("label", gridLabel).Msg("Selected automatic grid label")
	}

	var matches int
	labelMap := map[string]struct{}{}
	for _, ag := range filtered {
		perGridAlertGroup := map[string]*models.AlertGroup{}

		for k := range ag.Labels {
			labelMap[k] = struct{}{}
		}
		for _, alert := range ag.Alerts {
			alert := alert // scopelint pin

			for k := range alert.Labels {
				labelMap[k] = struct{}{}
			}

			allReceivers[alert.Receiver] = true

			matches++

			alertGridLabelValues := map[string]bool{}
			switch gridLabel {
			case "@receiver":
				alertGridLabelValues[alert.Receiver] = true
			case "@alertmanager":
				for _, am := range alert.Alertmanager {
					alertGridLabelValues[am.Name] = true
				}
			case "@cluster":
				for _, am := range alert.Alertmanager {
					alertGridLabelValues[am.Cluster] = true
				}
			default:
				alertGridLabelValues[alert.Labels[gridLabel]] = true
			}

			for alertGridLabelValue := range alertGridLabelValues {
				// we need to update fingerprints since we've modified some fields in dedup
				// and agCopy.ContentFingerprint() depends on per alert fingerprint
				// we update it here rather than in dedup since here we can apply it
				// only for alerts left after filtering
				alert.UpdateFingerprints()

				agCopy, found := perGridAlertGroup[alertGridLabelValue]
				if !found {
					agCopy = &models.AlertGroup{
						ID:                ag.ID,
						Receiver:          ag.Receiver,
						Labels:            ag.Labels,
						LatestStartsAt:    ag.LatestStartsAt,
						Alerts:            []models.Alert{},
						AlertmanagerCount: map[string]int{},
						StateCount:        map[string]int{},
					}
					for _, s := range models.AlertStateList {
						agCopy.StateCount[s] = 0
					}
					perGridAlertGroup[alertGridLabelValue] = agCopy
				}

				stateCount := map[string]int{}
				for _, s := range models.AlertStateList {
					stateCount[s] = 0
				}
				switch gridLabel {
				case "@alertmanager":
					ams := []models.AlertmanagerInstance{}
					for _, am := range alert.Alertmanager {
						if am.Name == alertGridLabelValue {
							ams = append(ams, am)
							stateCount[am.State]++
						}
					}
					alert.Alertmanager = ams
				case "@cluster":
					ams := []models.AlertmanagerInstance{}
					for _, am := range alert.Alertmanager {
						if am.Cluster == alertGridLabelValue {
							ams = append(ams, am)
							stateCount[am.State]++
						}
					}
					alert.Alertmanager = ams
				default:
					for _, am := range alert.Alertmanager {
						stateCount[am.State]++
					}
				}

				if stateCount[models.AlertStateActive] > 0 {
					alert.State = models.AlertStateActive
				} else if stateCount[models.AlertStateSuppressed] > 0 {
					alert.State = models.AlertStateSuppressed
				} else {
					alert.State = models.AlertStateUnprocessed
				}

				agCopy.Alerts = append(agCopy.Alerts, alert)

				if ck, foundKey := dedupedColors["@receiver"]; foundKey {
					if cv, foundVal := ck[alert.Receiver]; foundVal {
						if _, found := colors["@receiver"]; !found {
							colors["@receiver"] = map[string]models.LabelColors{}
						}
						colors["@receiver"][alert.Receiver] = cv
					}
				}

				if ck, foundKey := dedupedColors["@alertmanager"]; foundKey {
					for _, am := range alert.Alertmanager {
						if cv, foundVal := ck[am.Name]; foundVal {
							if _, found := colors["@alertmanager"]; !found {
								colors["@alertmanager"] = map[string]models.LabelColors{}
							}
							colors["@alertmanager"][am.Name] = cv
						}
					}
				}

				if ck, foundKey := dedupedColors["@cluster"]; foundKey {
					for _, am := range alert.Alertmanager {
						if cv, foundVal := ck[am.Cluster]; foundVal {
							if _, found := colors["@cluster"]; !found {
								colors["@cluster"] = map[string]models.LabelColors{}
							}
							colors["@cluster"][am.Cluster] = cv
						}
					}
				}

				agCopy.StateCount[alert.State]++

				for _, am := range alert.Alertmanager {
					if _, found := agCopy.AlertmanagerCount[am.Name]; !found {
						agCopy.AlertmanagerCount[am.Name] = 1
					} else {
						agCopy.AlertmanagerCount[am.Name]++
					}
				}

				for key, value := range alert.Labels {
					if keyMap, foundKey := dedupedColors[key]; foundKey {
						if color, foundColor := keyMap[value]; foundColor {
							if _, found := colors[key]; !found {
								colors[key] = map[string]models.LabelColors{}
							}
							colors[key][value] = color
						}
					}
				}
			}
		}

		for gridLabelValue, ag := range perGridAlertGroup {
			if len(ag.Alerts) > 0 {
				for _, alert := range ag.Alerts {
					for _, am := range alert.Alertmanager {
						for _, silence := range am.Silences {
							if _, found := silences[am.Cluster][silence.ID]; !found {
								if _, found :=  silences[am.Cluster]; !found {
									silences[am.Cluster] = map[string]models.Silence{}
								}
								silences[am.Cluster][silence.ID] = *silence
							}
						}
					}
				}
				sort.Sort(ag.Alerts)
				ag.LatestStartsAt = ag.FindLatestStartsAt()
				ag.Hash = ag.ContentFingerprint()
				apiAG := models.APIAlertGroup{AlertGroup: *ag, TotalAlerts: len(ag.Alerts)}
				apiAG.DedupSharedMaps([]string{gridLabel})
				resp.TotalAlerts += len(ag.Alerts)

				alertLimit, found := request.GroupLimits[ag.ID]
				if !found {
					if request.DefaultGroupLimit > 0 {
						alertLimit = request.DefaultGroupLimit
					} else {
						alertLimit = config.Config.UI.AlertsPerGroup
					}
				}
				if alertLimit > apiAG.TotalAlerts {
					alertLimit = apiAG.TotalAlerts
				}
				apiAG.Alerts = apiAG.Alerts[0:alertLimit]

				grid, found := grids[gridLabelValue]
				if !found {
					grid = models.APIGrid{
						LabelName:   gridLabel,
						LabelValue:  gridLabelValue,
						AlertGroups: []models.APIAlertGroup{},
						StateCount:  map[string]int{},
					}
					for _, s := range models.AlertStateList {
						grid.StateCount[s] = 0
					}
					grids[gridLabelValue] = grid
				}
				grid.AlertGroups = append(grid.AlertGroups, apiAG)
				for k, v := range apiAG.StateCount {
					grid.StateCount[k] += v
				}
				grids[gridLabelValue] = grid
			}
		}
	}

	sortedGrids := sortGrids(request, gridLabel, grids, request.GridSortReverse)
	for i := 0; i < len(sortedGrids); i++ {
		sortedGrids[i].TotalGroups = len(sortedGrids[i].AlertGroups)

		limit, found := request.GridLimits[sortedGrids[i].LabelValue]
		if !found {
			limit = config.Config.Grid.GroupLimit
		}

		l := sortedGrids[i].TotalGroups
		if limit < l {
			l = limit
		}
		if l < 1 {
			l = 1
		}
		sortedGrids[i].AlertGroups = sortedGrids[i].AlertGroups[:l]
	}

	for _, filter := range matchFilters {
		if filter.GetValue() != "" && filter.GetMatcher() == "=" {
			transform.ColorLabel(colors, filter.GetName(), filter.GetValue())
		}
	}

	receivers := []string{}
	for k := range allReceivers {
		k := k
		receivers = append(receivers, k)
	}
	sort.Strings(receivers)

	resp.LabelNames = make([]string, 0, len(labelMap))
	for label := range labelMap {
		resp.LabelNames = append(resp.LabelNames, label)
	}
	sort.Strings(resp.LabelNames)

	resp.Grids = sortedGrids
	resp.Silences = silences
	resp.Colors = colors
	resp.Filters = populateAPIFilters(matchFilters)
	resp.Receivers = receivers

	data, _ = json.Marshal(resp)
	compressedData, _ := compressResponse(data.([]byte), nil)
	_ = apiCache.Add(cacheKey, compressedData)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data.([]byte))
}

// autocomplete endpoint, json, used for filter autocomplete hints
func autocomplete(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data.([]byte))
		return
	}

	term, found := lookupQueryString(r, "term")
	if !found || term == "" {
		badRequestJSON(w, "missing term=<token> parameter")
		return
	}

	acData := sort.StringSlice{}

	dedupedAutocomplete := alertmanager.DedupAutocomplete()

	for _, hint := range dedupedAutocomplete {
		if strings.HasPrefix(strings.ToLower(hint.Value), strings.ToLower(term)) {
			acData = append(acData, hint.Value)
		} else {
			for _, token := range hint.Tokens {
				if strings.HasPrefix(strings.ToLower(token), strings.ToLower(term)) {
					acData = append(acData, hint.Value)
				}
			}
		}
	}

	sort.Sort(sort.Reverse(acData))
	data, _ = json.Marshal(acData)

	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data.([]byte))
}

func silences(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data.([]byte))
		return
	}

	dedupedSilences := []models.ManagedSilence{}

	showExpired := false
	showExpiredValue, found := lookupQueryString(r, "showExpired")
	if found && showExpiredValue == "1" {
		showExpired = true
	}

	searchTerm := ""
	searchTermValue, found := lookupQueryString(r, "searchTerm")
	if found && searchTermValue != "" {
		searchTerm = strings.ToLower(searchTermValue)
	}

	clusters := []string{}
	if searchTerm != "" {
		upstreams := getUpstreams()
		for _, u := range upstreams.Instances {
			if strings.ToLower(u.Name) == searchTerm || strings.ToLower(u.Cluster) == searchTerm {
				if !slices.StringInSlice(clusters, u.Cluster) {
					clusters = append(clusters, strings.ToLower(u.Cluster))
				}
			}
		}
	}

	for _, silence := range alertmanager.DedupSilences() {
		if silence.IsExpired && !showExpired {
			continue
		}
		if searchTerm != "" {
			isMatch := false
			if strings.ToLower(silence.Silence.ID) == searchTerm {
				isMatch = true
			} else if fmt.Sprintf("@cluster=%s", strings.ToLower(silence.Cluster)) == searchTerm {
				isMatch = true
			} else if slices.StringInSlice(clusters, strings.ToLower(silence.Cluster)) {
				isMatch = true
			} else if strings.Contains(strings.ToLower(silence.Silence.Comment), searchTerm) {
				isMatch = true
			} else if strings.Contains(strings.ToLower(silence.Silence.CreatedBy), searchTerm) {
				isMatch = true
			} else {
				for _, match := range silence.Silence.Matchers {
					eq := "="
					if match.IsRegex {
						eq = "=~"
					}
					if searchTerm == fmt.Sprintf("%s%s\"%s\"", strings.ToLower(match.Name), eq, strings.ToLower(match.Value)) {
						isMatch = true
					} else if strings.Contains(strings.ToLower(fmt.Sprintf("%s%s%s", match.Name, eq, match.Value)), searchTerm) {
						isMatch = true
					}
				}
			}
			if !isMatch {
				continue
			}
		}
		dedupedSilences = append(dedupedSilences, silence)
	}

	recentFirst := true
	sortReverse, found := lookupQueryString(r, "sortReverse")
	if found && sortReverse == "1" {
		recentFirst = false
	}

	sort.Slice(dedupedSilences, func(i int, j int) bool {
		if dedupedSilences[i].Silence.EndsAt.Equal(dedupedSilences[j].Silence.EndsAt) {
			if dedupedSilences[i].Silence.StartsAt.Equal(dedupedSilences[j].Silence.StartsAt) {
				return dedupedSilences[i].Silence.ID < dedupedSilences[j].Silence.ID
			}
			return dedupedSilences[i].Silence.StartsAt.After(dedupedSilences[j].Silence.StartsAt) == recentFirst
		}
		return dedupedSilences[i].Silence.EndsAt.Before(dedupedSilences[j].Silence.EndsAt) == recentFirst
	})

	silenceCounters := make(map[string]int, len(dedupedSilences))
	for _, silence := range dedupedSilences {
		silenceCounters[silence.Silence.ID] = 0
	}
	for _, alertGroup := range alertmanager.DedupAlerts() {
		for _, alert := range alertGroup.Alerts {
			clustersDone := map[string]bool{}
			for _, am := range alert.Alertmanager {
				for _, sID := range am.SilencedBy {
					if _, found := clustersDone[am.Cluster]; !found {
						if _, ok := silenceCounters[sID]; ok {
							silenceCounters[sID]++
							clustersDone[am.Cluster] = true
						}
					}
				}
			}
		}
	}
	for i := range dedupedSilences {
		if counter, ok := silenceCounters[dedupedSilences[i].Silence.ID]; ok {
			dedupedSilences[i].AlertCount = counter
		}
	}

	data, _ = json.Marshal(dedupedSilences)

	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data.([]byte))
}

type AlertList struct {
	Alerts []map[string]string `json:"alerts"`
}

func alertList(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	// use full URI (including query args) as cache key
	cacheKey := r.RequestURI

	d, found := apiCache.Get(cacheKey)
	if found {
		r := bytes.NewReader(d.([]byte))
		rawData, _ := decompressCachedResponse(r)
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(rawData)
		return
	}

	q, _ := lookupQueryStringSlice(r, "q")
	matchFilters := getFiltersFromQuery(q)
	dedupedAlerts := alertmanager.DedupAlerts()
	filtered := filterAlerts(dedupedAlerts, matchFilters)

	labelMap := map[string]map[string]string{}
	for _, ag := range filtered {
		for _, alert := range ag.Alerts {
			labels := map[string]string{}
			for k, v := range ag.Labels {
				labels[k] = v
			}
			for k, v := range alert.Labels {
				labels[k] = v
			}
			h := fmt.Sprintf("%x", structhash.Sha1(labels, 1))
			labelMap[h] = labels
		}
	}

	sortMap := map[string]struct{}{}
	for _, k := range labelMap {
		for v := range k {
			sortMap[v] = struct{}{}
		}
	}
	var sortKeys []string
	for k := range sortMap {
		sortKeys = append(sortKeys, k)
	}
	sort.Strings(sortKeys)

	al := AlertList{
		Alerts: []map[string]string{},
	}
	for _, labels := range labelMap {
		al.Alerts = append(al.Alerts, labels)
	}
	sortSliceOfLabels(al.Alerts, sortKeys, "alertname")

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	data, _ := json.Marshal(al)
	compressedData, _ := compressResponse(data, nil)
	_ = apiCache.Add(cacheKey, compressedData)
	_, _ = w.Write(data)
}

func sortSliceOfLabels(labels []map[string]string, sortKeys []string, fallback string) {
	sort.SliceStable(labels, func(i, j int) bool {
		for _, k := range sortKeys {
			if labels[i][k] != "" && labels[j][k] == "" {
				return true
			}
			if labels[i][k] == "" && labels[j][k] != "" {
				return false
			}
			if labels[i][k] != labels[j][k] {
				return sortorder.NaturalLess(labels[i][k], labels[j][k])
			}
		}
		return sortorder.NaturalLess(labels[i][fallback], labels[j][fallback])
	})
}

func counters(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	// use full URI (including query args) as cache key
	cacheKey := r.RequestURI

	d, found := apiCache.Get(cacheKey)
	if found {
		r := bytes.NewReader(d.([]byte))
		rawData, _ := decompressCachedResponse(r)
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(rawData)
		return
	}

	q, _ := lookupQueryStringSlice(r, "q")
	matchFilters := getFiltersFromQuery(q)
	dedupedAlerts := alertmanager.DedupAlerts()
	filtered := filterAlerts(dedupedAlerts, matchFilters)
	upstreams := getUpstreams()
	counters := map[string]map[string]int{}

	var total int
	for _, ag := range filtered {
		total += len(ag.Alerts)
		for _, alert := range ag.Alerts {
			if len(upstreams.Clusters) > 1 {
				clusters := map[string]struct{}{}
				for _, am := range alert.Alertmanager {
					clusters[am.Cluster] = struct{}{}
				}
				for cluster := range clusters {
					countLabel(counters, "@cluster", cluster)
				}
			}
			countLabel(counters, "@state", alert.State)
			countLabel(counters, "@receiver", alert.Receiver)
			for key, value := range alert.Labels {
				countLabel(counters, key, value)
			}
		}
	}

	resp := models.Counters{
		Total:    total,
		Counters: countersToLabelStats(counters),
	}

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	data, _ := json.Marshal(resp)
	compressedData, _ := compressResponse(data, nil)
	_ = apiCache.Add(cacheKey, compressedData)
	_, _ = w.Write(data)
}
