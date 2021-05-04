package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jarcoal/httpmock"
	"github.com/prometheus/common/model"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/regex"
	"github.com/rs/zerolog"
)

type prometheusAPIV1Labels struct {
	Status string   `json:"status"`
	Error  string   `json:"error,omitempty"`
	Data   []string `json:"data"`
}

type prometheusAPIV1QueryRange struct {
	Status string      `json:"status"`
	Data   queryResult `json:"data"`
}

type seriesValues struct {
	metric model.Metric
	values []int
}

type queryResult struct {
	ResultType string       `json:"resultType"`
	Result     model.Matrix `json:"result"`
}

func generateV1Matrix(series []seriesValues, step time.Duration) queryResult {
	r := queryResult{ResultType: "matrix", Result: model.Matrix{}}
	for _, serie := range series {
		ss := model.SampleStream{
			Metric: serie.metric,
		}
		ts := time.Now()
		for _, val := range serie.values {
			sp := model.SamplePair{
				Timestamp: model.TimeFromUnix(ts.Unix()),
				Value:     model.SampleValue(val),
			}
			ss.Values = append(ss.Values, sp)
			ts = ts.Add(step * -1)
		}
		r.Result = append(r.Result, &ss)
	}
	return r
}

func generateHistoryPayload(p AlertHistoryPayload) []byte {
	b, _ := json.Marshal(p)
	return b
}

func generateHistorySamples(values []int, offset time.Duration) []OffsetSample {
	ts := time.Now()
	os := []OffsetSample{}
	for _, val := range values {
		os = append(os, OffsetSample{
			Timestamp: ts,
			Value:     val,
		})
		ts = ts.Add(offset * -1)
	}
	return os
}

func generateIntSlice(val, inc, repeat int) []int {
	v := []int{}
	for i := 1; i <= repeat; i++ {
		v = append(v, val)
		val += inc
	}
	return v
}

func TestAlertHistory(t *testing.T) {
	type mock struct {
		method    string
		uri       *regexp.Regexp
		responder httpmock.Responder
	}

	type cfg struct {
		enabled bool
		timeout time.Duration
		workers int
		rewrite []config.HistoryRewrite
	}

	type historyQuery struct {
		payload  []byte
		code     int
		response AlertHistoryResponse
	}

	type testCaseT struct {
		mocks   []mock
		config  cfg
		queries []historyQuery
	}

	testCases := []testCaseT{
		{
			mocks: []mock{},
			config: cfg{
				enabled: false,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9091"},
						Labels:  map[string]string{"alertname": "Fake Alert"},
					}),
					code: 400,
				},
			},
		},
		{
			mocks: []mock{},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"%gh&%ij"},
						Labels:  map[string]string{"alertname": "Fake Alert"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Error:   `One or more errors occurred when querying Prometheus API: %gh&%ij: failed to create Prometheus API client: parse "%gh&%ij": invalid URL escape "%gh"`,
						Samples: generateHistorySamples(generateIntSlice(0, 0, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: []byte("foo"),
					code:    400,
				},
			},
		},
		{
			mocks: []mock{
				{
					method: "GET",
					uri:    regexp.MustCompile("^http://localhost:9092/api/v1/labels"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1Labels{
						Status: "success",
						Data:   []string{"alertname", "instance", "job"},
					}),
				},
				{
					method: "POST",
					uri:    regexp.MustCompile("^http://localhost:9092/api/v1/query_range"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1QueryRange{
						Status: "success",
						Data: generateV1Matrix(
							[]seriesValues{
								{
									metric: model.Metric{
										"alertname": "Fake Alert",
									},
									values: generateIntSlice(0, 1, 24),
								},
							}, time.Hour),
					}),
				},
			},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9092"},
						Labels:  map[string]string{"alertname": "Fake Alert", "cluster": "prod"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Samples: generateHistorySamples(generateIntSlice(0, 1, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{
				{
					method: "GET",
					uri:    regexp.MustCompile("^http://localhost:9093/api/v1/labels"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1Labels{
						Status: "success",
						Data:   []string{"alertname", "instance", "job"},
					}),
				},
				{
					method:    "POST",
					uri:       regexp.MustCompile("^http://localhost:9093/api/v1/query_range"),
					responder: httpmock.NewStringResponder(500, "Fatal error"),
				},
			},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9093"},
						Labels:  map[string]string{"alertname": "Fake Alert"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Error:   "One or more errors occurred when querying Prometheus API: http://localhost:9093: failed to run a range query Prometheus for alerts: server_error: server error: 500",
						Samples: generateHistorySamples(generateIntSlice(0, 0, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{
				{
					method: "GET",
					uri:    regexp.MustCompile("^http://localhost:909[4-6]/api/v1/labels"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1Labels{
						Status: "error",
						Error:  "mock error",
						Data:   []string{},
					}),
				},
			},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9094", "http://localhost:9095", "http://localhost:9096"},
						Labels:  map[string]string{"alertname": "Fake Alert", "cluster": "prod"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Error:   "One or more errors occurred when querying Prometheus API: http://localhost:9094: failed to query Prometheus for label names: : mock error, http://localhost:9095: failed to query Prometheus for label names: : mock error, http://localhost:9096: failed to query Prometheus for label names: : mock error",
						Samples: generateHistorySamples(generateIntSlice(0, 0, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{
				{
					method: "GET",
					uri:    regexp.MustCompile("^http://localhost:909[7-9]/api/v1/labels"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1Labels{
						Status: "success",
						Data:   []string{"alertname", "instance", "job"},
					}),
				},
				{
					method: "POST",
					uri:    regexp.MustCompile("^http://localhost:909[7-9]/api/v1/query_range"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1QueryRange{
						Status: "success",
						Data: generateV1Matrix(
							[]seriesValues{
								{
									metric: model.Metric{
										"alertname": "Fake Alert",
									},
									values: generateIntSlice(0, 1, 24),
								},
							}, time.Hour),
					}),
				},
			},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9097", "http://localhost:9098", "http://localhost:9099"},
						Labels:  map[string]string{"alertname": "Fake Alert", "cluster": "prod"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Samples: generateHistorySamples(generateIntSlice(0, 3, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
				rewrite: []config.HistoryRewrite{
					{
						SourceRegex: regex.MustCompileAnchored(".+"),
						URI:         "",
					},
				},
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9092"},
						Labels:  map[string]string{"alertname": "Fake Alert", "cluster": "prod"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Samples: generateHistorySamples(generateIntSlice(0, 0, 24), time.Hour),
					},
				},
			},
		},
		{
			mocks: []mock{
				{
					method: "GET",
					uri:    regexp.MustCompile("^http://localhost:9100/api/v1/labels"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1Labels{
						Status: "success",
						Data:   []string{"alertname", "instance", "job"},
					}),
				},
				{
					method: "POST",
					uri:    regexp.MustCompile("^http://localhost:9100/api/v1/query_range"),
					responder: httpmock.NewJsonResponderOrPanic(200, prometheusAPIV1QueryRange{
						Status: "success",
						Data: generateV1Matrix(
							[]seriesValues{
								{
									metric: model.Metric{
										"alertname": "Fake Alert",
									},
									values: generateIntSlice(0, 1, 24),
								},
							}, time.Hour),
					}),
				},
			},
			config: cfg{
				enabled: true,
				timeout: time.Second * 5,
				workers: 5,
				rewrite: []config.HistoryRewrite{
					{
						SourceRegex: regex.MustCompileAnchored("http://(.+):1111"),
						URI:         "http://$1:9100",
					},
					{
						SourceRegex: regex.MustCompileAnchored("foo"),
						URI:         "",
					},
					{
						SourceRegex: regex.MustCompileAnchored("http://(.+):909[0-9]"),
						URI:         "http://$1:9100",
					},
				},
			},
			queries: []historyQuery{
				{
					payload: generateHistoryPayload(AlertHistoryPayload{
						Sources: []string{"http://localhost:9090", "http://localhost:9091", "http://localhost:1111"},
						Labels:  map[string]string{"alertname": "Fake Alert", "cluster": "prod"},
					}),
					code: 200,
					response: AlertHistoryResponse{
						Samples: generateHistorySamples(generateIntSlice(0, 3, 24), time.Hour),
					},
				},
			},
		},
	}

	defer func() {
		config.Config.History.Enabled = true
		config.Config.History.Timeout = time.Second * 20
		config.Config.History.Workers = 30
		config.Config.History.Rewrite = []config.HistoryRewrite{}
	}()

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	mockConfig()

	hp := newHistoryPoller(1, time.Second*5)
	r := testRouter()
	setupRouter(r, hp)
	go hp.run(5)
	defer hp.stop()

	opt := cmp.Comparer(func(x, y time.Time) bool {
		return true
	})

	zerolog.SetGlobalLevel(zerolog.FatalLevel)
	for i, tc := range testCases {
		t.Run(fmt.Sprintf("%d/enabled=%v", i, tc.config.enabled), func(t *testing.T) {
			httpmock.Reset()

			for _, mock := range tc.mocks {
				httpmock.RegisterRegexpResponder(mock.method, mock.uri, mock.responder)
				t.Logf("Registered responder %s %s", mock.method, mock.uri)
			}
			config.Config.History.Enabled = tc.config.enabled
			config.Config.History.Timeout = tc.config.timeout
			config.Config.History.Workers = tc.config.workers
			config.Config.History.Rewrite = tc.config.rewrite

			for _, q := range tc.queries {
				t.Logf("Body: %s", string(q.payload))
				for i := 1; i < 100; i++ {
					req := httptest.NewRequest("POST", "/history.json", bytes.NewReader(q.payload))
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)
					if resp.Code != q.code {
						t.Errorf("POST /history.json returned status %d, %d expected", resp.Code, q.code)
						break
					}

					if resp.Code != 200 {
						continue
					}
					r := AlertHistoryResponse{}
					err := json.Unmarshal(resp.Body.Bytes(), &r)
					if err != nil {
						t.Errorf("Failed to unmarshal response: %s", err)
						break
					}
					if diff := cmp.Diff(q.response, r, opt); diff != "" {
						t.Errorf("Incorrect response (-want +got):\n%s", diff)
						break
					}
				}
			}
		})
	}
}

func TestAbsTime(t *testing.T) {
	type testCaseT struct {
		a    time.Time
		b    time.Time
		diff time.Duration
	}

	testCases := []testCaseT{
		{
			a:    time.Date(2021, 6, 7, 12, 13, 0, 0, time.UTC),
			b:    time.Date(2021, 6, 7, 12, 13, 5, 0, time.UTC),
			diff: time.Second * 5,
		},
		{
			a:    time.Date(2021, 6, 7, 12, 13, 10, 0, time.UTC),
			b:    time.Date(2021, 6, 7, 12, 13, 5, 0, time.UTC),
			diff: time.Second * 5,
		},
	}

	for i, tc := range testCases {
		t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
			d := absTimeDiff(tc.a, tc.b)
			if diff := cmp.Diff(tc.diff, d); diff != "" {
				t.Errorf("Incorrect absTimeDiff result (-want +got):\n%s", diff)
			}
		})
	}
}

func TestRewriteSource(t *testing.T) {
	type testCaseT struct {
		rules []config.HistoryRewrite
		uri   string
		out   string
	}

	testCases := []testCaseT{
		{
			rules: []config.HistoryRewrite{},
			uri:   "http://localhost",
			out:   "http://localhost",
		},
		{
			rules: []config.HistoryRewrite{
				{
					SourceRegex: regex.MustCompileAnchored("foo"),
					URI:         "foo",
				},
			},
			uri: "http://localhost",
			out: "http://localhost",
		},
		{
			rules: []config.HistoryRewrite{
				{
					SourceRegex: regex.MustCompileAnchored("foo"),
					URI:         "foo",
				},
				{
					SourceRegex: regex.MustCompileAnchored("http://local.+"),
					URI:         "foo",
				},
			},
			uri: "http://localhost",
			out: "foo",
		},
		{
			rules: []config.HistoryRewrite{
				{
					SourceRegex: regex.MustCompileAnchored("foo"),
					URI:         "foo",
				},
				{
					SourceRegex: regex.MustCompileAnchored("http://(.+).example.com"),
					URI:         "https://prom-$1.example.com",
				},
			},
			uri: "http://prod.example.com",
			out: "https://prom-prod.example.com",
		},
	}

	for i, tc := range testCases {
		t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
			uri := rewriteSource(tc.rules, tc.uri)
			if diff := cmp.Diff(tc.out, uri); diff != "" {
				t.Errorf("Incorrect rewriteSource result (-want +got):\n%s", diff)
			}
		})
	}
}
