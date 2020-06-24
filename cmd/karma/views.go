package main

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/filters"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
	"github.com/prymitive/karma/internal/transform"

	"github.com/gin-gonic/gin"

	log "github.com/sirupsen/logrus"
)

func notFound(c *gin.Context) {
	c.String(404, "404 page not found")
}

func noCache(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
}

func pong(c *gin.Context) {
	c.String(200, "Pong")
}

func compressResponse(data []byte) ([]byte, error) {
	var b bytes.Buffer
	// this only fails if we pass unsupported level (3 is valid)
	gz, _ := gzip.NewWriterLevel(&b, 3)

	_, err := gz.Write(data)
	if err != nil {
		return nil, fmt.Errorf("failed to compress data: %s", err.Error())
	}

	if err = gz.Close(); err != nil {
		return nil, fmt.Errorf("failed to close compression writer: %s", err.Error())
	}

	compressed := b.Bytes()
	log.Debugf("Compressed %d bytes to %d bytes (%.2f%%)", len(data), len(compressed), (float64(len(compressed))/float64(len(data)))*100)

	return compressed, nil
}

func decompressCachedResponse(data []byte) ([]byte, error) {
	b := bytes.NewReader(data)
	z, err := gzip.NewReader(b)
	if err != nil {
		return nil, fmt.Errorf("failed to created new compression reader: %s", err.Error())
	}
	p, err := ioutil.ReadAll(z)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress data: %s", err.Error())
	}
	return p, nil
}

func index(c *gin.Context) {
	start := time.Now()

	noCache(c)

	filtersJSON, err := json.Marshal(config.Config.Filters.Default)
	if err != nil {
		panic(err)
	}
	filtersB64 := base64.StdEncoding.EncodeToString(filtersJSON)

	defaults, err := json.Marshal(config.Config.UI)
	if err != nil {
		panic(err)
	}
	defaultsB64 := base64.StdEncoding.EncodeToString(defaults)

	c.HTML(http.StatusOK, "ui/build/index.html", gin.H{
		"KarmaName":     config.Config.Karma.Name,
		"Version":       version,
		"SentryDSN":     config.Config.Sentry.Public,
		"DefaultFilter": filtersB64,
		"Defaults":      defaultsB64,
	})

	log.Infof("[%s] %s %s took %s", c.ClientIP(), c.Request.Method, c.Request.RequestURI, time.Since(start))
}

func logAlertsView(c *gin.Context, cacheStatus string, duration time.Duration) {
	log.Infof("[%s %s] <%d> %s %s took %s", c.ClientIP(), cacheStatus, http.StatusOK, c.Request.Method, c.Request.RequestURI, duration)
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
func alerts(c *gin.Context) {
	noCache(c)
	start := time.Now()
	ts, _ := start.UTC().MarshalText()

	var username string
	if config.Config.Authentication.Enabled {
		username = c.MustGet(gin.AuthUserKey).(string)
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
		AnnotationsDefaultHidden: config.Config.Annotations.Default.Hidden,
		AnnotationsHidden:        config.Config.Annotations.Hidden,
		AnnotationsVisible:       config.Config.Annotations.Visible,
		SilenceForm: models.SilenceFormSettings{
			Strip: models.SilenceFormStripSettings{
				Labels: config.Config.SilenceForm.Strip.Labels,
			},
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         config.Config.AlertAcknowledgement.Enabled,
			DurationSeconds: int(config.Config.AlertAcknowledgement.Duration.Seconds()),
			Author:          config.Config.AlertAcknowledgement.Author,
			CommentPrefix:   config.Config.AlertAcknowledgement.CommentPrefix,
		},
	}
	resp.Authentication = models.AuthenticationInfo{
		Enabled:  config.Config.Authentication.Enabled,
		Username: username,
	}

	if config.Config.Grid.Sorting.CustomValues.Labels != nil {
		resp.Settings.Sorting.ValueMapping = config.Config.Grid.Sorting.CustomValues.Labels
	}

	// use full URI (including query args) as cache key
	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		rawData, err := decompressCachedResponse(data.([]byte))
		if err != nil {
			log.Error(err.Error())
			panic(err)
		}

		// need to overwrite settings as they can have user specific data
		newResp := models.AlertsResponse{}
		err = json.Unmarshal(rawData, &newResp)
		if err != nil {
			log.Error(err.Error())
			panic(err)
		}
		newResp.Settings = resp.Settings
		newResp.Timestamp = string(ts)
		newResp.Authentication = resp.Authentication
		newData, err := json.Marshal(&newResp)
		if err != nil {
			log.Error(err.Error())
			panic(err)
		}
		c.Data(http.StatusOK, gin.MIMEJSON, newData)
		logAlertsView(c, "HIT", time.Since(start))
		return
	}

	gridLabel, _ := c.GetQuery("gridLabel")

	matchFilters, validFilters := getFiltersFromQuery(c.QueryArray("q"))

	grids := map[string]models.APIGrid{}
	colors := models.LabelsColorMap{}
	counters := map[string]map[string]int{}

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

	var matches int
	for _, ag := range dedupedAlerts {
		perGridAlertGroup := map[string]*models.AlertGroup{}

		for _, alert := range ag.Alerts {
			alert := alert // scopelint pin

			allReceivers[alert.Receiver] = true

			results := []bool{}
			if validFilters {
				for _, filter := range matchFilters {
					if filter.GetIsValid() {
						match := filter.Match(&alert, matches)
						results = append(results, match)
					}
				}
			}
			if !validFilters || (slices.BoolInSlice(results, true) && !slices.BoolInSlice(results, false)) {

				blockedAMs := map[string]bool{}
				for _, am := range alert.Alertmanager {
					am := am
					for _, filter := range matchFilters {
						if filter.GetIsValid() && filter.GetIsAlertmanagerFilter() && !filter.MatchAlertmanager(&am) {
							blockedAMs[am.Name] = true
						}
					}
				}
				if len(blockedAMs) > 0 {
					ams := []models.AlertmanagerInstance{}
					for _, am := range alert.Alertmanager {
						_, found := blockedAMs[am.Name]
						if !found {
							ams = append(ams, am)
						}
					}
					alert.Alertmanager = ams
				}
				if len(alert.Alertmanager) == 0 {
					continue
				}

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
					alert := models.Alert(alert)

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

					if len(upstreams.Clusters) > 1 {
						clusters := map[string]bool{}
						for _, am := range alert.Alertmanager {
							clusters[am.Cluster] = true
						}
						for cluster := range clusters {
							countLabel(counters, "@cluster", cluster)
						}
					}

					countLabel(counters, "@state", alert.State)

					countLabel(counters, "@receiver", alert.Receiver)
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
						countLabel(counters, key, value)
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
								silences[am.Cluster][silence.ID] = *silence
							}
						}
					}
				}
				sort.Sort(ag.Alerts)
				ag.LatestStartsAt = ag.FindLatestStartsAt()
				ag.Hash = ag.ContentFingerprint()
				apiAG := models.APIAlertGroup{AlertGroup: *ag}
				apiAG.DedupSharedMaps()
				resp.TotalAlerts += len(ag.Alerts)

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

	for _, filter := range matchFilters {
		if filter.GetValue() != "" && filter.GetMatcher() == "=" {
			transform.ColorLabel(colors, filter.GetName(), filter.GetValue())
		}
	}

	//resp.AlertGroups = sortAlertGroups(c, alerts)
	v, _ := c.GetQuery("gridSortReverse")
	gridSortReverse := v == "1"

	receivers := []string{}
	for k := range allReceivers {
		k := k
		receivers = append(receivers, k)
	}
	sort.Strings(receivers)

	resp.Grids = sortGrids(c, gridLabel, grids, gridSortReverse)
	resp.Silences = silences
	resp.Colors = colors
	resp.Counters = countersToLabelStats(counters)
	resp.Filters = populateAPIFilters(matchFilters)
	resp.Receivers = receivers

	data, err := json.Marshal(resp)
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}
	compressedData, err := compressResponse(data.([]byte))
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}
	apiCache.Set(cacheKey, compressedData, -1)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
	logAlertsView(c, "MIS", time.Since(start))
}

// autocomplete endpoint, json, used for filter autocomplete hints
func autocomplete(c *gin.Context) {
	noCache(c)
	start := time.Now()

	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
		logAlertsView(c, "HIT", time.Since(start))
		return
	}

	term, found := c.GetQuery("term")
	if !found || term == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing term=<token> parameter"})
		log.Infof("[%s] <%d> %s %s took %s", c.ClientIP(), http.StatusBadRequest, c.Request.Method, c.Request.RequestURI, time.Since(start))
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
	data, err := json.Marshal(acData)
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}

	apiCache.Set(cacheKey, data, time.Second*15)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
	logAlertsView(c, "MIS", time.Since(start))
}

func silences(c *gin.Context) {
	noCache(c)
	start := time.Now()

	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
		logAlertsView(c, "HIT", time.Since(start))
		return
	}

	dedupedSilences := []models.ManagedSilence{}

	showExpired := false
	showExpiredValue, found := c.GetQuery("showExpired")
	if found && showExpiredValue == "1" {
		showExpired = true
	}

	searchTerm := ""
	searchTermValue, found := c.GetQuery("searchTerm")
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
	sortReverse, found := c.GetQuery("sortReverse")
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

	data, err := json.Marshal(dedupedSilences)
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}

	apiCache.Set(cacheKey, data, time.Second*15)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
	logAlertsView(c, "MIS", time.Since(start))
}
