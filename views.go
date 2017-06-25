package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/slices"

	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
)

var (
	// needed for serving favicon from binary assets
	faviconFileServer = http.FileServer(newBinaryFileSystem("static"))
)

func noCache(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
}

// index view, html
func index(c *gin.Context) {
	start := time.Now()

	cssFiles := readAssets("css")
	jsFiles := readAssets("js")
	noCache(c)

	q, qPresent := c.GetQuery("q")
	defaultUsed := true
	if qPresent {
		defaultUsed = false
	}

	// FIXME
	//silencesAPI, err := transport.JoinURL(config.Config.AlertmanagerURI, "api/v1/silences")
	//if err != nil {
	//	log.Errorf("Can't generate silences API URL: %s", err)
	//}

	c.HTML(http.StatusOK, "templates/index.html", gin.H{
		"Version":           version,
		"SentryDSN":         config.Config.SentryPublicDSN,
		"CSSFiles":          cssFiles,
		"JSFiles":           jsFiles,
		"NowQ":              start.Unix(),
		"Config":            config.Config,
		"QFilter":           q,
		"DefaultUsed":       defaultUsed,
		"StaticColorLabels": strings.Join(config.Config.ColorLabelsStatic, " "),
		"WebPrefix":         config.Config.WebPrefix,
		"SilencesApi":       "FIXME",
	})

	log.Infof("[%s] %s %s took %s", c.ClientIP(), c.Request.Method, c.Request.RequestURI, time.Since(start))
}

// Help view, html
func help(c *gin.Context) {
	start := time.Now()
	cssFiles := readAssets("css")
	noCache(c)
	c.HTML(http.StatusOK, "templates/help.html", gin.H{
		"CSSFiles":  cssFiles,
		"SentryDSN": config.Config.SentryPublicDSN,
		"WebPrefix": config.Config.WebPrefix,
	})
	log.Infof("[%s] <%d> %s %s took %s", c.ClientIP(), http.StatusOK, c.Request.Method, c.Request.RequestURI, time.Since(start))
}

func logAlertsView(c *gin.Context, cacheStatus string, duration time.Duration) {
	log.Infof("[%s %s] <%d> %s %s took %s", c.ClientIP(), cacheStatus, http.StatusOK, c.Request.Method, c.Request.RequestURI, duration)
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

	// update error field, needs a lock
	// FIXME resp.Error = string(alertManagerError)

	if resp.Error != "" {
		apiCache.Flush()
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
	apiFilters := []models.Filter{}
	matchFilters, validFilters := getFiltersFromQuery(c.Query("q"))

	// set pointers for data store objects, need a lock until end of view is reached
	alerts := []models.AlertGroup{}
	colors := models.LabelsColorMap{}
	counters := models.LabelsCountMap{}

	dedupedAlerts := alertmanager.DedupAlerts()
	dedupedColors := alertmanager.DedupColors()

	var matches int
	for _, ag := range dedupedAlerts {
		agCopy := models.AlertGroup{
			ID:         ag.ID,
			Receiver:   ag.Receiver,
			Labels:     ag.Labels,
			Alerts:     []models.Alert{},
			StateCount: map[string]int{},
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

				agCopy.StateCount[alert.State]++

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
			agCopy.Hash = agCopy.ContentFingerprint()
			alerts = append(alerts, agCopy)
		}

	}

	resp.AlertGroups = alerts
	resp.Colors = colors
	resp.Counters = counters

	for _, filter := range matchFilters {
		af := models.Filter{
			Text:    filter.GetRawText(),
			Hits:    filter.GetHits(),
			IsValid: filter.GetIsValid(),
		}
		apiFilters = append(apiFilters, af)
	}
	resp.Filters = apiFilters

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
	if cacheKey == "" {
		// FIXME c.Request.RequestURI is empty when running tests for some reason
		// needs checking, below acts as a workaround
		cacheKey = c.Request.URL.RawQuery
	}

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

func favicon(c *gin.Context) {
	if config.Config.WebPrefix != "/" {
		c.Request.URL.Path = strings.TrimPrefix(c.Request.URL.Path, config.Config.WebPrefix)
	}
	faviconFileServer.ServeHTTP(c.Writer, c.Request)
}
