package main

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"runtime"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/cnf/structhash"
	"github.com/fvbommel/sortorder"
	jsonv2 "github.com/go-json-experiment/json"
	"github.com/go-json-experiment/json/jsontext"
	promlabels "github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
	sliceutils "github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/transform"

	"github.com/rs/zerolog/log"
)

func marshalJSON(v any) ([]byte, error) {
	return jsonv2.Marshal(v, jsontext.EscapeForHTML(true))
}

func noCache(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
}

func mimeJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

func badRequestJSON(w http.ResponseWriter, err string) {
	mimeJSON(w)
	w.WriteHeader(http.StatusBadRequest)
	out, _ := marshalJSON(map[string]string{"error": err})
	_, _ = w.Write(out)
}

type KarmaVersion struct {
	Version string `json:"version"`
	Golang  string `json:"golang"`
}

func versionHandler(w http.ResponseWriter, _ *http.Request) {
	ver := KarmaVersion{
		Version: version,
		Golang:  runtime.Version(),
	}
	data, _ := jsonv2.Marshal(ver, jsontext.Multiline(true), jsontext.WithIndent("  "))
	_, _ = w.Write(data)
}

func pong(w http.ResponseWriter, _ *http.Request) {
	_, _ = w.Write([]byte("Pong\n"))
}

func robots(w http.ResponseWriter, _ *http.Request) {
	_, _ = w.Write([]byte("User-agent: *\nDisallow: /\n"))
}

func redirectIndex(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, r.URL.Path+"/", http.StatusMovedPermanently)
}

func index(w http.ResponseWriter, _ *http.Request) {
	noCache(w)

	filtersJSON, _ := marshalJSON(config.Config.Filters.Default)
	filtersB64 := base64.StdEncoding.EncodeToString(filtersJSON)

	defaults, _ := marshalJSON(config.Config.UI)
	defaultsB64 := base64.StdEncoding.EncodeToString(defaults)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = indexTemplate.Execute(w, map[string]string{
		"KarmaName":     config.Config.Karma.Name,
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
	var groups []string
	if config.Config.Authentication.Enabled {
		username = getUserFromContext(r)
		groups = getGroupsFromContext(r)
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
		AnnotationsDefaultHidden: config.Config.Annotations.Default.Hidden,
		AnnotationsHidden:        config.Config.Annotations.Hidden,
		AnnotationsVisible:       config.Config.Annotations.Visible,
		AnnotationsAllowHTML:     config.Config.Annotations.EnableInsecureHTML,
		SilenceForm: models.SilenceFormSettings{
			Strip: models.SilenceFormStripSettings{
				Labels: config.Config.SilenceForm.Strip.Labels,
			},
			DefaultAlertmanagers: config.Config.SilenceForm.DefaultAlertmanagers,
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         config.Config.AlertAcknowledgement.Enabled,
			DurationSeconds: int(config.Config.AlertAcknowledgement.Duration.Seconds()),
			Author:          config.Config.AlertAcknowledgement.Author,
			Comment:         config.Config.AlertAcknowledgement.Comment,
		},
		HistoryEnabled: config.Config.History.Enabled,
		GridGroupLimit: config.Config.Grid.GroupLimit,
		Labels:         models.LabelsSettings{},
	}
	resp.Authentication = models.AuthenticationInfo{
		Enabled:  config.Config.Authentication.Enabled,
		Username: username,
		Groups:   groups,
	}

	if config.Config.Grid.Sorting.CustomValues.Labels != nil {
		resp.Settings.Sorting.ValueMapping = config.Config.Grid.Sorting.CustomValues.Labels
	}

	var request models.AlertsRequest
	err := jsonv2.UnmarshalRead(r.Body, &request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := hex.EncodeToString(structhash.Sha1(request, 1))

	data, found := apiCache.Get(cacheKey)
	if found {
		// need to overwrite settings as they can have user specific data
		newResp := models.AlertsResponse{}
		_ = jsonv2.Unmarshal(data, &newResp)
		labels := newResp.Settings.Labels
		newResp.Settings = resp.Settings
		newResp.Settings.Labels = labels
		newResp.Timestamp = string(ts)
		newResp.Authentication = resp.Authentication
		data, _ = marshalJSON(&newResp)
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
		return
	}

	grids := map[string]models.APIGrid{}
	colors := models.LabelsColorMap{}
	silences := map[string]map[string]models.Silence{}
	allReceivers := map[string]struct{}{}

	dedupedAlerts := alertmanager.DedupAlerts()
	dedupedColors := alertmanager.DedupColors()
	matchFilters := getFiltersFromQuery(request.Filters)
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

		ag.Labels.Range(func(l promlabels.Label) {
			labelMap[l.Name] = struct{}{}
		})
		for _, alert := range ag.Alerts {
			alert.Labels.Range(func(l promlabels.Label) {
				labelMap[l.Name] = struct{}{}
			})

			allReceivers[alert.Receiver] = struct{}{}

			matches++

			alertGridLabelValues := map[string]struct{}{}
			switch gridLabel {
			case "@receiver":
				alertGridLabelValues[alert.Receiver] = struct{}{}
			case "@alertmanager":
				for _, am := range alert.Alertmanager {
					alertGridLabelValues[am.Name] = struct{}{}
				}
			case "@cluster":
				for _, am := range alert.Alertmanager {
					alertGridLabelValues[am.Cluster] = struct{}{}
				}
			default:
				alertGridLabelValues[alert.Labels.Get(gridLabel)] = struct{}{}
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
						agCopy.StateCount[s.String()] = 0
					}
					perGridAlertGroup[alertGridLabelValue] = agCopy
				}

				stateCount := newStateCount()
				switch gridLabel {
				case "@alertmanager":
					ams := []models.AlertmanagerInstance{}
					for _, am := range alert.Alertmanager {
						if am.Name == alertGridLabelValue {
							ams = append(ams, am)
							stateCount[am.State.String()]++
						}
					}
					alert.Alertmanager = ams
				case "@cluster":
					ams := []models.AlertmanagerInstance{}
					for _, am := range alert.Alertmanager {
						if am.Cluster == alertGridLabelValue {
							ams = append(ams, am)
							stateCount[am.State.String()]++
						}
					}
					alert.Alertmanager = ams
				default:
					for _, am := range alert.Alertmanager {
						stateCount[am.State.String()]++
					}
				}

				alert.State = stateFromStateCount(stateCount)

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

				agCopy.StateCount[alert.State.String()]++

				for _, am := range alert.Alertmanager {
					if _, found := agCopy.AlertmanagerCount[am.Name]; !found {
						agCopy.AlertmanagerCount[am.Name] = 1
					} else {
						agCopy.AlertmanagerCount[am.Name]++
					}
				}

				alert.Labels.Range(func(l promlabels.Label) {
					if keyMap, foundKey := dedupedColors[l.Name]; foundKey {
						if color, foundColor := keyMap[l.Value]; foundColor {
							if _, found := colors[l.Name]; !found {
								colors[l.Name] = map[string]models.LabelColors{}
							}
							colors[l.Name][l.Value] = color
						}
					}
				})
			}
		}

		for gridLabelValue, ag := range perGridAlertGroup {
			if len(ag.Alerts) > 0 {
				for _, alert := range ag.Alerts {
					for _, am := range alert.Alertmanager {
						for _, silence := range am.Silences {
							if _, found := silences[am.Cluster][silence.ID]; !found {
								if _, found := silences[am.Cluster]; !found {
									silences[am.Cluster] = map[string]models.Silence{}
								}
								silences[am.Cluster][silence.ID] = *silence
							}
						}
					}
				}
				slices.SortFunc(ag.Alerts, models.CompareAlerts)
				ag.LatestStartsAt = ag.FindLatestStartsAt()
				ag.Hash = ag.ContentFingerprint()
				totalAlerts := len(ag.Alerts)
				shared, allLabels := ag.DedupSharedMaps([]string{gridLabel})
				resp.TotalAlerts += totalAlerts

				alertLimit, found := request.GroupLimits[ag.ID]
				if !found {
					if request.DefaultGroupLimit > 0 {
						alertLimit = request.DefaultGroupLimit
					} else {
						alertLimit = config.Config.UI.AlertsPerGroup
					}
				}
				if alertLimit > totalAlerts {
					alertLimit = totalAlerts
				}
				ag.Alerts = ag.Alerts[0:alertLimit]
				apiAG := models.NewAPIAlertGroup(*ag, shared, allLabels, totalAlerts)

				grid, found := grids[gridLabelValue]
				if !found {
					grid = models.APIGrid{
						LabelName:   gridLabel,
						LabelValue:  gridLabelValue,
						AlertGroups: []models.APIAlertGroup{},
						StateCount:  map[string]int{},
					}
					for _, s := range models.AlertStateList {
						grid.StateCount[s.String()] = 0
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
	for i := range sortedGrids {
		sortedGrids[i].TotalGroups = len(sortedGrids[i].AlertGroups)

		limit, found := request.GridLimits[sortedGrids[i].LabelValue]
		if !found {
			limit = config.Config.Grid.GroupLimit
		}

		l := min(limit, sortedGrids[i].TotalGroups)
		if l < 1 {
			l = 1
		}
		sortedGrids[i].AlertGroups = sortedGrids[i].AlertGroups[:l]
	}

	for _, filter := range matchFilters {
		if filter.GetValue() != "" && filter.GetMatcher() == "=" {
			transform.ColorLabel(colors, filter.GetName(), filter.GetValue())
			labelSettings(filter.GetName(), resp.Settings.Labels)
		}
	}

	receivers := []string{}
	for k := range allReceivers {
		receivers = append(receivers, k)
	}
	sort.Strings(receivers)

	resp.LabelNames = make([]string, 0, len(labelMap))
	for label := range labelMap {
		resp.LabelNames = append(resp.LabelNames, label)
	}
	sort.Strings(resp.LabelNames)

	labelsSettings(sortedGrids, resp.Settings.Labels)

	resp.Grids = sortedGrids
	resp.Silences = silences
	resp.Colors = colors
	resp.Filters = populateAPIFilters(matchFilters)
	resp.Receivers = receivers

	data, _ = marshalJSON(resp)
	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func labelsSettings(grids []models.APIGrid, store models.LabelsSettings) {
	labelSettings("@alertmanager", store)
	labelSettings("@cluster", store)
	labelSettings("@receiver", store)
	labelSettings("@state", store)
	labelSettings("@inhibited", store)
	labelSettings("@inhibited_by", store)
	for _, grid := range grids {
		labelSettings(grid.LabelName, store)
		for _, ag := range grid.AlertGroups {
			for _, l := range ag.Labels {
				labelSettings(l.Name, store)
			}
			for _, alert := range ag.Alerts {
				for _, l := range alert.Labels {
					labelSettings(l.Name, store)
				}
			}
		}
	}
}

func labelSettings(name string, store models.LabelsSettings) {
	var isStatic, isValueOnly bool
	if slices.Contains(config.Config.Labels.Color.Static, name) {
		isStatic = true
	}
	if slices.Contains(config.Config.Labels.ValueOnly, name) || sliceutils.MatchesAnyRegex(name, config.Config.Labels.CompiledValueOnlyRegex) {
		isValueOnly = true
	}
	if isStatic || isValueOnly {
		if _, ok := store[name]; !ok {
			store[name] = models.LabelSettings{
				IsStatic:    isStatic,
				IsValueOnly: isValueOnly,
			}
		}
	}
}

// autocomplete endpoint, json, used for filter autocomplete hints
func autocomplete(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
		return
	}

	term, found := lookupQueryString(r, "term")
	if !found || term == "" {
		badRequestJSON(w, "missing term=<token> parameter")
		return
	}

	acData := sort.StringSlice{}

	dedupedAutocomplete := alertmanager.DedupAutocomplete()

	lowerTerm := strings.ToLower(term)
	for _, hint := range dedupedAutocomplete {
		if strings.HasPrefix(strings.ToLower(hint.Value), lowerTerm) {
			acData = append(acData, hint.Value)
		} else {
			for _, token := range hint.Tokens {
				if strings.HasPrefix(strings.ToLower(token), lowerTerm) {
					acData = append(acData, hint.Value)
				}
			}
		}
	}

	sort.Sort(sort.Reverse(acData))
	data, _ = marshalJSON(acData)
	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func silences(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
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
				if !slices.Contains(clusters, u.Cluster) {
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
			switch {
			case strings.ToLower(silence.Silence.ID) == searchTerm:
				isMatch = true
			case "@cluster="+strings.ToLower(silence.Cluster) == searchTerm:
				isMatch = true
			case slices.Contains(clusters, strings.ToLower(silence.Cluster)):
				isMatch = true
			case strings.Contains(strings.ToLower(silence.Silence.Comment), searchTerm):
				isMatch = true
			case strings.Contains(strings.ToLower(silence.Silence.CreatedBy), searchTerm):
				isMatch = true
			default:
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

	sort.Slice(dedupedSilences, func(i, j int) bool {
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
			sidDone := map[string]struct{}{}
			for _, am := range alert.Alertmanager {
				for _, sID := range am.SilencedBy {
					if _, found := sidDone[sID]; !found {
						if _, ok := silenceCounters[sID]; ok {
							silenceCounters[sID]++
							sidDone[sID] = struct{}{}
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

	data, _ = marshalJSON(dedupedSilences)
	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

type AlertList struct {
	Alerts []promlabels.Labels `json:"alerts"`
}

func alertList(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	// use full URI (including query args) as cache key
	cacheKey := r.RequestURI

	d, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(d)
		return
	}

	q, _ := lookupQueryStringSlice(r, "q")
	matchFilters := getFiltersFromQuery(q)
	dedupedAlerts := alertmanager.DedupAlerts()
	filtered := filterAlerts(dedupedAlerts, matchFilters)

	labelMap := map[string]map[string]string{}
	for _, ag := range filtered {
		for _, alert := range ag.Alerts {
			lm := ag.Labels.Map()
			alert.Labels.Range(func(l promlabels.Label) {
				lm[l.Name] = l.Value
			})
			h := hex.EncodeToString(structhash.Sha1(lm, 1))
			labelMap[h] = lm
		}
	}

	sortMap := map[string]struct{}{}
	for _, k := range labelMap {
		for v := range k {
			sortMap[v] = struct{}{}
		}
	}
	sortKeys := make([]string, 0, len(sortMap))
	for k := range sortMap {
		sortKeys = append(sortKeys, k)
	}
	sort.Strings(sortKeys)

	al := AlertList{
		Alerts: []promlabels.Labels{},
	}
	for _, lm := range labelMap {
		al.Alerts = append(al.Alerts, models.LabelsFromMap(lm))
	}
	sortSliceOfLabels(al.Alerts, sortKeys, "alertname")

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	data, _ := marshalJSON(al)
	_ = apiCache.Add(cacheKey, data)
	_, _ = w.Write(data)
}

func sortSliceOfLabels(ls []promlabels.Labels, sortKeys []string, fallback string) {
	sort.SliceStable(ls, func(i, j int) bool {
		for _, k := range sortKeys {
			vi := ls[i].Get(k)
			vj := ls[j].Get(k)
			if vi != "" && vj == "" {
				return true
			}
			if vi == "" && vj != "" {
				return false
			}
			if vi != vj {
				return sortorder.NaturalLess(vi, vj)
			}
		}
		return sortorder.NaturalLess(ls[i].Get(fallback), ls[j].Get(fallback))
	})
}

func counters(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	// use full URI (including query args) as cache key
	cacheKey := r.RequestURI

	d, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(d)
		return
	}

	q, _ := lookupQueryStringSlice(r, "q")
	matchFilters := getFiltersFromQuery(q)
	dedupedAlerts := alertmanager.DedupAlerts()
	filtered := filterAlerts(dedupedAlerts, matchFilters)
	upstreams := getUpstreams()
	counters := map[string]map[string]int{}

	countLabel := func(key, val string) {
		if _, found := counters[key]; !found {
			counters[key] = make(map[string]int)
		}
		counters[key][val]++
	}

	var total int
	for _, ag := range filtered {
		total += len(ag.Alerts)
		for _, alert := range ag.Alerts {
			stateCount := newStateCount()
			for _, am := range alert.Alertmanager {
				stateCount[am.State.String()]++
			}
			alert.State = stateFromStateCount(stateCount)

			if len(upstreams.Clusters) > 1 {
				clusters := map[string]struct{}{}
				for _, am := range alert.Alertmanager {
					clusters[am.Cluster] = struct{}{}
				}
				for cluster := range clusters {
					countLabel("@cluster", cluster)
				}
			}
			countLabel("@state", alert.State.String())
			countLabel("@receiver", alert.Receiver)
			alert.Labels.Range(func(l promlabels.Label) {
				countLabel(l.Name, l.Value)
			})
		}
	}

	resp := models.Counters{
		Total:    total,
		Counters: countersToLabelStats(counters),
	}

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	data, _ := marshalJSON(resp)
	_ = apiCache.Add(cacheKey, data)
	_, _ = w.Write(data)
}
