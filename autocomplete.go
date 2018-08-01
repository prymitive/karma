package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prymitive/unsee/internal/alertmanager"

	log "github.com/sirupsen/logrus"
)

// knownLabelNames allows querying known label names
func knownLabelNames(c *gin.Context) {
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

	labels := alertmanager.DedupKnownLabels()
	acData := []string{}

	term, found := c.GetQuery("term")
	if !found || term == "" {
		// return everything
		sort.Strings(labels)
		acData = labels
	} else {
		// return what matches
		for _, key := range labels {
			if strings.Contains(key, term) {
				acData = append(acData, key)
			}
		}
		sort.Strings(acData)
	}

	data, err := json.Marshal(acData)
	if err != nil {
		log.Error(err.Error())
		panic(err)
	}

	apiCache.Set(cacheKey, data, time.Second*15)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
	logAlertsView(c, "MIS", time.Since(start))
}
