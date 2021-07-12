package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"runtime"
	"testing"

	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
	"github.com/rs/zerolog"
)

func reportMemoryMetrics(b *testing.B) {
	var m runtime.MemStats

	runtime.GC()
	runtime.ReadMemStats(&m)

	b.ReportMetric(float64(m.Alloc), "B/alloc")
}

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
			reportMemoryMetrics(b)

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

			b.StopTimer()
			reportMemoryMetrics(b)
			b.StartTimer()
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

			b.StopTimer()
			reportMemoryMetrics(b)
			b.StartTimer()
		}
	})
}

func BenchmarkPullAlerts(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	mockConfig()
	for _, version := range mock.ListAllMocks() {
		version := version
		b.Run(version, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				mockAlerts(version)

				b.StopTimer()
				reportMemoryMetrics(b)
				b.StartTimer()
			}
		})
		break
	}
}

func BenchmarkAlertsAPIMisses(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	payload, err := json.Marshal(models.AlertsRequest{
		Filters:    []string{},
		GridLimits: map[string]int{},
	})
	if err != nil {
		b.Error(err)
		b.FailNow()
	}

	mockConfig()
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
				reportMemoryMetrics(b)
				apiCache.Purge()
				b.StartTimer()
			}
		})
		break
	}
}

func BenchmarkAlertsAPIMissesAutoGrid(b *testing.B) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	mockConfig()
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
					GridLimits: map[string]int{},
					GridLabel:  "@auto",
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
				reportMemoryMetrics(b)
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
		Filters:    []string{},
		GridLimits: map[string]int{},
	})
	if err != nil {
		b.Error(err)
		b.FailNow()
	}

	mockConfig()
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

				b.StopTimer()
				reportMemoryMetrics(b)
				b.StartTimer()
			}
		})
		break
	}
}
