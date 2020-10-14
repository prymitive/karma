package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prymitive/karma/internal/alertmanager"
)

// knownLabelNames allows querying known label names
func knownLabelNames(c *gin.Context) {
	noCache(c)

	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
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

	data, _ = json.Marshal(acData)

	apiCache.Set(cacheKey, data, time.Second*15)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
}

func knownLabelValues(c *gin.Context) {
	noCache(c)

	cacheKey := c.Request.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
		return
	}

	name, found := c.GetQuery("name")
	if !found || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing name=<token> parameter"})
		return
	}

	values := alertmanager.DedupKnownLabelValues(name)
	sort.Strings(values)

	data, _ = json.Marshal(values)

	apiCache.Set(cacheKey, data, time.Second*15)

	c.Data(http.StatusOK, gin.MIMEJSON, data.([]byte))
}
