package main

import (
	"encoding/base64"
	"encoding/json"
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

func index(c *gin.Context) {
	start := time.Now()

	username := c.GetHeader("X-WEBAUTH-USER")

	noCache(c)

	filtersJSON, err := json.Marshal(config.Config.Filters.Default)
	if err != nil {
		panic(err)
	}
	filtersB64 := base64.StdEncoding.EncodeToString(filtersJSON)

	if username != "" {
            c.SetCookie("am-author", username, 86400, "/", c.Request.Host, false, false)
        }

	c.HTML(http.StatusOK, "ui/build/index.html", gin.H{
		"Version":       version,
		"SentryDSN":     config.Config.Sentry.Public,
		"DefaultFilter": filtersB64,
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

	// intialize response object, set fields that don't require any locking
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
			ValueMapping: map[string]map[string]int{},
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
	}

	if config.Config.Grid.Sorting.CustomValues.Labels != nil {
		resp.Settings.Sorting.ValueMapping = config.Config.Grid.Sorting.CustomValues.Labels
	}

	// use full URI (including query args) as cache key
	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
		logAlertsView(c, "HIT", time.Since(start))
		return
	}

	// get filters
	matchFilters, validFilters := getFiltersFromQuery(c.QueryArray("q"))

	// set pointers for data store objects, need a lock until end of view is reached
	alerts := map[string]models.APIAlertGroup{}
	colors := models.LabelsColorMap{}

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
			Alerts:            []models.Alert{},
			AlertmanagerCount: map[string]int{},
			StateCount:        map[string]int{},
		}
		for _, s := range models.AlertStateList {
			agCopy.StateCount[s] = 0
		}

		for _, alert := range ag.Alerts {
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

	resp.AlertGroups = alerts
	resp.Silences = silences
	resp.Colors = colors
	resp.Filters = populateAPIFilters(matchFilters)

	data, err := json.Marshal(resp)
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}
	apiCache.Set(cacheKey, data, -1)

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
