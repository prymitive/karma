package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"github.com/prymitive/karma/internal/alertmanager"
)

// lookup query parameter expecting a string, if multiple values are presetn return the last one
func lookupQueryString(r *http.Request, key string) (string, bool) {
	vals, found := r.URL.Query()[key]
	if !found {
		return "", found
	}
	return vals[len(vals)-1], found
}

func lookupQueryStringSlice(r *http.Request, key string) ([]string, bool) {
	vals, found := r.URL.Query()[key]
	return vals, found
}

// knownLabelNames allows querying known label names
func knownLabelNames(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data.([]byte))
		return
	}

	labels := alertmanager.DedupKnownLabels()
	acData := []string{}

	term, found := r.URL.Query()["term"]
	if !found || len(term) == 0 {
		// return everything
		sort.Strings(labels)
		acData = labels
	} else {
		// return what matches
		for _, key := range labels {
			if strings.Contains(key, term[len(term)-1]) {
				acData = append(acData, key)
			}
		}
		sort.Strings(acData)
	}

	data, _ = json.Marshal(acData)

	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data.([]byte))
}

func knownLabelValues(w http.ResponseWriter, r *http.Request) {
	noCache(w)

	cacheKey := r.RequestURI

	data, found := apiCache.Get(cacheKey)
	if found {
		mimeJSON(w)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data.([]byte))
		return
	}

	name, found := r.URL.Query()["name"]
	if !found || len(name) == 0 || name[len(name)-1] == "" {
		badRequestJSON(w, "missing name=<token> parameter")
		return
	}

	values := alertmanager.DedupKnownLabelValues(name[len(name)-1])
	sort.Strings(values)

	data, _ = json.Marshal(values)

	_ = apiCache.Add(cacheKey, data)

	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data.([]byte))
}
