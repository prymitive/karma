package main

// stripped down version of https://github.com/chenjiandongx/ginprom

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
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
			Name: "http_request_duration_seconds",
			Help: "HTTP request latencies in seconds.",
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

func promMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := fmt.Sprintf("%d", c.Writer.Status())
		handler := c.HandlerName()
		method := c.Request.Method

		lvs := []string{status, handler, method}

		reqCount.WithLabelValues(lvs...).Inc()
		reqDuration.WithLabelValues(lvs...).Observe(time.Since(start).Seconds())
		respSizeBytes.WithLabelValues(lvs...).Observe(float64(c.Writer.Size()))
	}
}

func promHandler(handler http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
