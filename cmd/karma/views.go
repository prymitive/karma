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
	gz, err := gzip.NewWriterLevel(&b, 3)
	if err != nil {
		return nil, fmt.Errorf("failed to create new compression writer: %s", err.Error())
	}

	_, err = gz.Write(data)
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

	c.HTML(http.StatusOK, "index.html", gin.H{
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

	// initialize response object, set fields that don't require any locking
	resp := models.AlertsResponse{}
	resp.Status = "success"
	resp.Timestamp = string(ts)
	resp.Version = version
	resp.Upstreams = getUpstreams()
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

	// get filters
	matchFilters, validFilters := getFiltersFromQuery(c.QueryArray("q"))

	// set pointers for data store objects, need a lock until end of view is reached
	alerts := map[string]models.APIAlertGroup{}
	colors := models.LabelsColorMap{}
	counters := map[string]map[string]int{}

	dedupedAlerts := alertmanager.DedupAlerts()
	dedupedColors := alertmanager.DedupColors()

	amNameToCluster := map[string]string{}
	silences := map[string]map[string]models.Silence{}
	for _, am := range alertmanager.GetAlertmanagers() {
		key := am.ClusterID()
		amNameToCluster[am.Name] = key
		_, found := silences[key]
		if !found {
			silences[key] = map[string]models.Silence{}
		}
	}

	var matches int
	for _, ag := range dedupedAlerts {
		agCopy := models.AlertGroup{
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

		for _, alert := range ag.Alerts {
			alert := alert // scopelint pin
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
				matches++
				// we need to update fingerprints since we've modified some fields in dedup
				// and agCopy.ContentFingerprint() depends on per alert fingerprint
				// we update it here rather than in dedup since here we can apply it
				// only for alerts left after filtering
				alert.UpdateFingerprints()
				agCopy.Alerts = append(agCopy.Alerts, alert)

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

		if len(agCopy.Alerts) > 0 {
			for i, alert := range agCopy.Alerts {
				if alert.IsSilenced() {
					for j, am := range alert.Alertmanager {
						key := amNameToCluster[am.Name]
						// cluster might be wrong when collecting (races between fetches)
						// update is with current cluster discovery state
						agCopy.Alerts[i].Alertmanager[j].Cluster = key
						for _, silence := range am.Silences {
							_, found := silences[key][silence.ID]
							if !found {
								silences[key][silence.ID] = *silence
							}
						}
					}
				}
			}
			sort.Sort(agCopy.Alerts)
			agCopy.LatestStartsAt = agCopy.FindLatestStartsAt()
			agCopy.Hash = agCopy.ContentFingerprint()
			apiAG := models.APIAlertGroup{AlertGroup: agCopy}
			apiAG.DedupSharedMaps()
			alerts[agCopy.ID] = apiAG
			resp.TotalAlerts += len(agCopy.Alerts)
		}

	}

	for _, filter := range matchFilters {
		if filter.GetValue() != "" && filter.GetMatcher() == "=" {
			transform.ColorLabel(colors, filter.GetName(), filter.GetValue())
		}
	}

	resp.AlertGroups = sortAlertGroups(c, alerts)
	resp.Silences = silences
	resp.Colors = colors
	resp.Counters = countersToLabelStats(counters)
	resp.Filters = populateAPIFilters(matchFilters)

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
			if strings.ToLower(u.Name) == searchTerm {
				if !slices.StringInSlice(clusters, u.Cluster) {
					clusters = append(clusters, u.Cluster)
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
			} else if slices.StringInSlice(clusters, silence.Cluster) {
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
			for _, sID := range alert.SilencedBy {
				if _, ok := silenceCounters[sID]; ok {
					silenceCounters[sID]++
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
