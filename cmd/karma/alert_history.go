package main

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
	"github.com/rs/zerolog/log"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/slices"
	uriUtil "github.com/prymitive/karma/internal/uri"
)

type AlertHistoryPayload struct {
	Sources []string          `json:"sources"`
	Labels  map[string]string `json:"labels"`
}

type OffsetSample struct {
	Timestamp time.Time `json:"timestamp"`
	Value     int       `json:"value"`
}

type AlertHistoryResponse struct {
	Error   string         `json:"error"`
	Samples []OffsetSample `json:"samples"`
}

func alertHistory(historyPoller *historyPoller, w http.ResponseWriter, r *http.Request) {
	noCache(w)

	if !config.Config.History.Enabled {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var payload AlertHistoryPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	perSource := map[string][]OffsetSample{}
	errors := []string{}

	for _, source := range payload.Sources {
		results := make(chan historyQueryResult)
		historyPoller.submit(source, payload.Labels, results)
		r := <-results
		if r.err != nil {
			errors = append(errors, fmt.Sprintf("%s: %s", source, r.err))
			continue
		}
		perSource[source] = r.values
	}

	var e string
	if len(errors) > 0 {
		e = fmt.Sprintf("One or more errors occurred when querying Prometheus API: %s", strings.Join(errors, ", "))
	}
	resp := AlertHistoryResponse{
		Error:   e,
		Samples: make([]OffsetSample, 24),
	}
	ts := time.Now().Add(time.Hour)
	for i := 0; i < 24; i++ {
		ts = ts.Add(time.Hour * -1)
		resp.Samples[i].Timestamp = ts
	}

	for _, vals := range perSource {
		for _, val := range vals {
			for i, fin := range resp.Samples {
				if absTimeDiff(val.Timestamp, fin.Timestamp) < time.Minute*30 {
					resp.Samples[i].Value += val.Value
					break
				}
			}
		}
	}

	data, _ := json.Marshal(resp)
	mimeJSON(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

type historyQueryResult struct {
	values []OffsetSample
	err    error
}

type historyJob struct {
	uri    string
	labels map[string]string
	result chan<- historyQueryResult
}

type cachedOffsets struct {
	values    []OffsetSample
	timestamp time.Time
}

type knownBadUpstream struct {
	timestamp time.Time
	err       error
}

type historyPoller struct {
	queue        chan historyJob
	queryTimeout time.Duration
	knownBad     *lru.Cache[string, *knownBadUpstream]
	cache        *lru.Cache[string, *cachedOffsets]
	isRunning    atomic.Bool
}

func newHistoryPoller(queueSize int, queryTimeout time.Duration) *historyPoller {
	log.Debug().Int("queue", queueSize).Dur("timeout", queryTimeout).Msg("Starting history poller")
	cache, _ := lru.New[string, *cachedOffsets](1000)
	knownBad, _ := lru.New[string, *knownBadUpstream](100)
	return &historyPoller{
		queue:        make(chan historyJob, queueSize),
		queryTimeout: queryTimeout,
		knownBad:     knownBad,
		cache:        cache,
	}
}

func (hp *historyPoller) run(workers int) {
	hp.isRunning.Store(true)
	wg := sync.WaitGroup{}
	for w := 1; w <= workers; w++ {
		w := w
		wg.Add(1)
		go func() {
			defer wg.Done()
			hp.startWorker(w)
		}()
	}
	wg.Wait()
}

func (hp *historyPoller) stop() {
	log.Debug().Msg("Stopping history poller")
	hp.isRunning.Store(false)
	close(hp.queue)
}

func (hp *historyPoller) submit(uri string, labels map[string]string, result chan<- historyQueryResult) {
	if hp.isRunning.Load() {
		hp.queue <- historyJob{uri: uri, labels: labels, result: result}
	}
}

func (hp *historyPoller) cacheSave(key string, values []OffsetSample) {
	_ = hp.cache.Add(key, &cachedOffsets{timestamp: time.Now(), values: values})
}

func (hp *historyPoller) cacheLookup(key string) *cachedOffsets {
	if val, found := hp.cache.Get(key); found {
		return val
	}
	return nil
}

func (hp *historyPoller) knownBadSave(key string, kb knownBadUpstream) {
	_ = hp.knownBad.Add(key, &kb)
}

func (hp *historyPoller) knownBadLookup(key string) (*knownBadUpstream, bool) {
	if val, found := hp.knownBad.Get(key); found {
		return val, true
	}
	return nil, false
}

func (hp *historyPoller) startWorker(wid int) {
	log.Debug().Int("worker", wid).Int("queue", cap(hp.queue)).Dur("timeout", hp.queryTimeout).Msg("Starting history poller")
	for j := range hp.queue {
		sourceURI, headers := rewriteSource(config.Config.History.Rewrite, j.uri)
		expiredAt := time.Now().Add(time.Minute * -5)
		key := hashQuery(sourceURI, j.labels)
		if kb, found := hp.knownBadLookup(key); found && kb.timestamp.After(expiredAt) {
			log.Debug().
				Int("worker", wid).
				Str("uri", sourceURI).
				Interface("labels", j.labels).
				Str("key", key).
				Msg("Upstream already marked as invalid, skipping")
			j.result <- historyQueryResult{values: nil, err: kb.err}
			continue
		}
		if v := hp.cacheLookup(key); v != nil && v.timestamp.After(expiredAt) {
			log.Debug().
				Int("worker", wid).
				Str("uri", sourceURI).
				Interface("labels", j.labels).
				Str("key", key).
				Msg("Got results from cache")
			j.result <- historyQueryResult{values: v.values, err: nil}
			continue
		}
		transport, err := rewriteTransport(config.Config.History.Rewrite, j.uri)
		if err != nil {
			log.Warn().
				Int("worker", wid).
				Str("uri", sourceURI).
				Err(err).
				Msg("Error while configuring HTTP transport for history request")
		}
		if len(headers) > 0 {
			transport = mapper.SetHeaders(transport, headers)
		}
		values, err := countAlerts(sourceURI, hp.queryTimeout, transport, j.labels)
		if err != nil {
			log.Error().
				Err(err).
				Int("worker", wid).
				Str("uri", sourceURI).
				Interface("labels", j.labels).
				Msg("History query failed")
			hp.knownBadSave(key, knownBadUpstream{timestamp: time.Now(), err: err})
		} else {
			hp.cacheSave(key, values)
		}
		j.result <- historyQueryResult{values: values, err: err}
	}
}

func hashQuery(uri string, labels map[string]string) string {
	hasher := sha1.New()
	_, _ = io.WriteString(hasher, uri)
	kvs := make([]string, len(labels))
	for k, v := range labels {
		kvs = append(kvs, fmt.Sprintf("%s=%s", k, v))
	}
	sort.Strings(kvs)
	_, _ = io.WriteString(hasher, strings.Join(kvs, "\n"))
	return fmt.Sprintf("%x", hasher.Sum(nil))
}

func rewriteSource(rules []config.HistoryRewrite, uri string) (string, map[string]string) {
	// trim trailing / to ensure all URIs are without a /
	uri = strings.TrimSuffix(uri, "/")
	for _, rule := range rules {
		if !rule.SourceRegex.MatchString(uri) {
			continue
		}
		result := []byte{}
		for _, submatches := range rule.SourceRegex.FindAllStringSubmatchIndex(uri, -1) {
			result = rule.SourceRegex.ExpandString(result, rule.URI, uri, submatches)
		}
		log.Debug().Str("source", uri).Str("uri", string(result)).Msg("Alert history source rewrite")
		return string(result), rule.Headers
	}
	return uri, nil
}

func rewriteTransport(rules []config.HistoryRewrite, uri string) (http.RoundTripper, error) {
	// trim trailing / to ensure all URIs are without a /
	uri = strings.TrimSuffix(uri, "/")
	for _, rule := range rules {
		if !rule.SourceRegex.MatchString(uri) {
			continue
		}
		var err error
		transport := http.DefaultTransport

		if rule.TLS.CA != "" || rule.TLS.Cert != "" || rule.TLS.InsecureSkipVerify {
			transport, err = alertmanager.NewHTTPTransport(rule.TLS.CA, rule.TLS.Cert, rule.TLS.Key, rule.TLS.InsecureSkipVerify)
			if err != nil {
				return http.DefaultTransport, fmt.Errorf("failed to create HTTP transport for '%s': %w", uriUtil.SanitizeURI(uri), err)
			}
		}

		if rule.ProxyURL != "" {
			proxyURL, err := url.Parse(rule.ProxyURL)
			if err != nil {
				return http.DefaultTransport, fmt.Errorf("failed to parse provided proxy url %q: %w", rule.ProxyURL, err)
			}
			transport.(*http.Transport).Proxy = http.ProxyURL(proxyURL)
		}

		return transport, nil
	}

	return http.DefaultTransport, nil
}

func countAlerts(uri string, timeout time.Duration, transport http.RoundTripper, labels map[string]string) (ret []OffsetSample, err error) {
	if uri == "" {
		return
	}

	client, err := api.NewClient(api.Config{
		Address:      uri,
		RoundTripper: transport,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Prometheus API client: %w", err)
	}

	v1api := v1.NewAPI(client)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	names, _, err := v1api.LabelNames(
		ctx,
		[]string{`{__name__="ALERTS_FOR_STATE"}`},
		time.Now().Add(time.Minute*-5),
		time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to query Prometheus for label names: %w", err)
	}

	r := v1.Range{
		Start: time.Now().Add(-time.Hour * 23),
		End:   time.Now(),
		Step:  time.Hour,
	}

	lv := model.LabelSet{}
	for k, v := range labels {
		if slices.StringInSlice(names, k) {
			lv[model.LabelName(k)] = model.LabelValue(v)
		}
	}
	q := fmt.Sprintf("changes(ALERTS_FOR_STATE%s[1h])", lv)
	log.Debug().
		Str("uri", uri).
		Interface("labels", labels).
		Str("query", q).
		Dur("timeout", timeout).
		Msg("Send alert count query")

	result, _, err := v1api.QueryRange(ctx, q, r)
	if err != nil {
		return nil, fmt.Errorf("failed to run a range query Prometheus for alerts: %w", err)
	}

	if samples, ok := result.(model.Matrix); ok {
		for _, sample := range samples {
			log.Debug().Int("values", len(sample.Values)).Msg("Sample values")
			for _, pair := range sample.Values {
				log.Debug().Int("value", int(pair.Value)).Time("timestamp", pair.Timestamp.Time()).Msg("Sample")
				ret = append(ret, OffsetSample{
					Timestamp: pair.Timestamp.Time(),
					Value:     int(pair.Value),
				})
			}
		}
	}

	return ret, nil
}

func absTimeDiff(a, b time.Time) time.Duration {
	if a.Before(b) {
		return b.Sub(a)
	}
	return a.Sub(b)
}
