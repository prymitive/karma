package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prymitive/karma/internal/config"
	"github.com/rs/zerolog/log"
)

var (
	labels = []string{"status", "handler", "method"}

	reqCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_request_count_total",
			Help: "Total number of HTTP requests made.",
		}, labels,
	)

	reqDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latencies in seconds.",
			Buckets: []float64{0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
		}, labels,
	)

	respSizeBytes = prometheus.NewSummaryVec(
		prometheus.SummaryOpts{
			Name: "http_response_size_bytes",
			Help: "HTTP response sizes in bytes.",
		}, labels,
	)
)

func init() {
	prometheus.MustRegister(reqCount, reqDuration, respSizeBytes)
}

func promMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		status := fmt.Sprintf("%d", ww.Status())
		method := r.Method

		rctx := chi.RouteContext(r.Context())
		routePattern := strings.Join(rctx.RoutePatterns, "")
		routePattern = strings.Replace(routePattern, "/*/", "/", -1)
		if routePattern == "" {
			routePattern = "middleware"
		}

		lvs := []string{status, routePattern, method}

		reqCount.WithLabelValues(lvs...).Inc()
		reqDuration.WithLabelValues(lvs...).Observe(time.Since(start).Seconds())
		respSizeBytes.WithLabelValues(lvs...).Observe(float64(ww.BytesWritten()))

		ww.Header().Set("Content-Length", strconv.Itoa(ww.BytesWritten()))
		if config.Config.Log.Requests {
			log.Log().
				Str("address", r.RemoteAddr).
				Str("path", r.URL.RequestURI()).
				Str("duration", time.Since(start).String()).
				Str("method", r.Method).Int("code", ww.Status()).
				Int("bytes", ww.BytesWritten()).
				Msg("Request completed")
		}
	})
}
