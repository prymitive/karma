package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/prymitive/unsee/internal/alertmanager"
	"github.com/prymitive/unsee/internal/config"
	"github.com/prymitive/unsee/internal/models"
	"github.com/prymitive/unsee/internal/slices"

	"github.com/gin-gonic/gin"

	log "github.com/sirupsen/logrus"
)

func index(c *gin.Context) {
	// http.FileServer doesn't allow serving index.html, it will always redirect
	// such request to ./ so we need to manually read that file and return it
	responseFromStaticFile(c, "/index.html", "text/html")
}

func help(c *gin.Context) {
	responseFromStaticFile(c, "/help.html", "text/html")
}

func notFound(c *gin.Context) {
	c.String(404, "404 page not found")
}

func noCache(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
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
	resp.Upstreams = getUpstreams()
	resp.StaticColorLabels = config.Config.Labels.Color.Static

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
	matchFilters, validFilters := getFiltersFromQuery(c.QueryArray("q"))

	// set pointers for data store objects, need a lock until end of view is reached
	alerts := map[string]models.AlertGroup{}
	colors := models.LabelsColorMap{}
	// used for top labels dropdown
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
			alerts[agCopy.ID] = agCopy
			resp.TotalAlerts += len(agCopy.Alerts)
		}

	}

	resp.AlertGroups = alerts
	resp.Colors = colors
	resp.Counters = counters

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
