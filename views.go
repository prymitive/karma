package main

import (
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"

	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
)

var (
	// needed for serving favicon from binary assets
	faviconFileServer = http.FileServer(newBinaryFileSystem("static"))
)

func boolInSlice(boolArray []bool, value bool) bool {
	for _, s := range boolArray {
		if s == value {
			return true
		}
	}
	return false
}

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
	resp := models.UnseeAlertsResponse{}
	resp.Status = "success"
	resp.Timestamp = string(ts)
	resp.Version = version

	// update error field, needs a lock
	errorLock.RLock()
	resp.Error = string(alertManagerError)
	errorLock.RUnlock()

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
	apiFilters := []models.UnseeFilter{}
	matchFilters, validFilters := getFiltersFromQuery(c.Query("q"))

	// set pointers for data store objects, need a lock until end of view is reached
	alerts := []models.UnseeAlertGroup{}
	silences := map[string]models.UnseeSilence{}
	colors := models.UnseeColorMap{}
	counters := models.UnseeCountMap{}
	store.StoreLock.RLock()

	var matches int
	for _, ag := range store.AlertStore.Store {
		agCopy := models.UnseeAlertGroup{
			ID:     ag.ID,
			Labels: ag.Labels,
			Alerts: []models.UnseeAlert{},
		}
		h := sha1.New()

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
			if !validFilters || (boolInSlice(results, true) && !boolInSlice(results, false)) {
				matches++
				agCopy.Alerts = append(agCopy.Alerts, alert)
				aj, err := json.Marshal(alert)
				if err != nil {
					log.Error(err.Error())
					panic(err.Error())
				}
				io.WriteString(h, string(aj))

				if alert.Silenced > 0 {
					if silence, found := store.SilenceStore.Store[strconv.Itoa(alert.Silenced)]; found {
						silences[strconv.Itoa(alert.Silenced)] = silence
					}
					agCopy.SilencedCount++
					countLabel(counters, "@silenced", "true")
				} else {
					agCopy.UnsilencedCount++
					countLabel(counters, "@silenced", "false")
				}

				for key, value := range alert.Labels {
					if keyMap, foundKey := store.ColorStore.Store[key]; foundKey {
						if color, foundColor := keyMap[value]; foundColor {
							if _, found := colors[key]; !found {
								colors[key] = map[string]models.UnseeLabelColor{}
							}
							colors[key][value] = color
						}
					}
					countLabel(counters, key, value)
				}
			}
		}

		if len(agCopy.Alerts) > 0 {
			agCopy.Hash = fmt.Sprintf("%x", h.Sum(nil))
			alerts = append(alerts, agCopy)
		}

	}

	resp.AlertGroups = alerts
	resp.Silences = silences
	resp.Colors = colors
	resp.Counters = counters

	for _, filter := range matchFilters {
		af := models.UnseeFilter{
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
	store.StoreLock.RUnlock()

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

	acData := []string{}

	store.StoreLock.RLock()
	for _, hint := range store.AutocompleteStore.Store {
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
	store.StoreLock.RUnlock()

	sort.Strings(acData)
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
