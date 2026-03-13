package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http/httptest"
	"testing"

	"github.com/prymitive/karma/internal/log"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
)

func BenchmarkPullAlerts(b *testing.B) {
	log.SetLevel(slog.LevelError)

	mockConfig(b.Setenv)
	for _, version := range mock.ListAllMocks() {

		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				mockAlerts(version)
			}
		})
		break
	}
}

func BenchmarkAlertsAPIMisses(b *testing.B) {
	log.SetLevel(slog.LevelError)

	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		b.Error(err)
		b.FailNow()
	}

	mockConfig(b.Setenv)
	for _, version := range mock.ListAllMocks() {
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				b.StopTimer()
				uri := fmt.Sprintf("/alerts.json?_=%d", i)
				req := httptest.NewRequest("POST", uri, bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				b.StartTimer()
				r.ServeHTTP(resp, req)

				b.StopTimer()
				apiCache.Purge()
				b.StartTimer()
			}
		})
		break
	}
}

func BenchmarkAlertsAPIMissesAutoGrid(b *testing.B) {
	log.SetLevel(slog.LevelError)

	mockConfig(b.Setenv)
	for _, version := range mock.ListAllMocks() {
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				b.StopTimer()
				payload, err := json.Marshal(models.AlertsRequest{
					Filters: []string{
						fmt.Sprintf("foo!=%d", i),
					},
					GridLimits:        map[string]int{},
					GridLabel:         "@auto",
					DefaultGroupLimit: 5,
				})
				if err != nil {
					b.Error(err)
					b.FailNow()
				}
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				b.StartTimer()
				r.ServeHTTP(resp, req)

				b.StopTimer()
				apiCache.Purge()
				b.StartTimer()
			}
		})
		break
	}
}

func BenchmarkAlertsAPIHits(b *testing.B) {
	log.SetLevel(slog.LevelError)

	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		b.Error(err)
		b.FailNow()
	}

	mockConfig(b.Setenv)
	for _, version := range mock.ListAllMocks() {
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)

		req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				b.StopTimer()
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				b.StartTimer()
				r.ServeHTTP(resp, req)
			}
		})
		break
	}
}
