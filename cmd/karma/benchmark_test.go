package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/rs/zerolog"

	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
)

func BenchmarkCompress(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	data, err := os.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	b.Run("Run", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			compressed, err := compressResponse(data, nil)
			if err != nil {
				b.Errorf("Failed to compress data: %s", err.Error())
			}

			b.StopTimer()
			ratio := float64(len(compressed)) / float64(len(data))
			b.ReportMetric(ratio, "%/compression")
			b.StartTimer()
		}
	})
}

func BenchmarkDecompress(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	data, err := os.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	compressed, err := compressResponse(data, nil)
	if err != nil {
		b.Errorf("Failed to compress data: %s", err.Error())
	}

	b.Run("Run", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, err := decompressCachedResponse(bytes.NewReader(compressed))
			if err != nil {
				b.Errorf("Failed to decompress data: %s", err.Error())
			}
		}
	})
}

func BenchmarkCompressionAndDecompression(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	data, err := os.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	b.Run("Run", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			compressed, err := compressResponse(data, nil)
			if err != nil {
				b.Errorf("Failed to compress data: %s", err.Error())
			}

			_, err = decompressCachedResponse(bytes.NewReader(compressed))
			if err != nil {
				b.Errorf("Failed to decompress data: %s", err.Error())
			}
		}
	})
}

func BenchmarkPullAlerts(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	mockConfig(b.Setenv)
	for _, version := range mock.ListAllMocks() {
		version := version
		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				mockAlerts(version)
			}
		})
		break
	}
}

func BenchmarkAlertsAPIMisses(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

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
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

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
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

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
