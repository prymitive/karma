package main

import (
	"sync"
	"time"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/transform"

	"github.com/DeanThompson/ginpprof"
	log "github.com/Sirupsen/logrus"
	raven "github.com/getsentry/raven-go"
	"github.com/gin-gonic/contrib/sentry"
	"github.com/gin-gonic/gin"
	ginprometheus "github.com/mcuadros/go-gin-prometheus"
	"github.com/patrickmn/go-cache"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	version = "dev"

	// ticker is a timer used by background loop that will keep pulling
	// data from AlertManager
	ticker *time.Ticker

	// apiCache will be used to keep short lived copy of JSON reponses generated for the UI
	// If there are requests with the same filter we should respond from cache
	// rather than do all the filtering every time
	apiCache *cache.Cache

	// errorLock holds a mutex used to synchronize updates to AlertManagerError
	// to avoid any race between readers and writers
	errorLock = sync.RWMutex{}
	// alertManagerError holds the description of last error raised when pulling data
	// from AlertManager, if there was any error
	// This error will be returned in UnseeAlertsResponse and presented by Ui
	alertManagerError string

	metricAlerts = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_collected_alerts",
			Help: "Total number of alerts collected from AlertManager API",
		},
		[]string{"silenced"},
	)
	metricAlertGroups = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "unsee_collected_groups",
			Help: "Total number of alert groups collected from AlertManager API",
		},
	)
	metricAlertManagerErrors = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_alertmanager_errors_total",
			Help: "Total number of errors encounter when requesting data from AlertManager API",
		},
		[]string{"endpoint"},
	)
)

func init() {
	prometheus.MustRegister(metricAlerts)
	prometheus.MustRegister(metricAlertGroups)
	prometheus.MustRegister(metricAlertManagerErrors)

	metricAlertManagerErrors.With(prometheus.Labels{"endpoint": "alerts"}).Set(0)
	metricAlertManagerErrors.With(prometheus.Labels{"endpoint": "silences"}).Set(0)
}

func main() {
	log.Infof("Version: %s", version)

	config.Config.Read()
	transform.ParseRules(config.Config.JIRARegexp)

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	// before we start try to fetch data from AlertManager
	log.Infof("Initial AlertManager query, this can delay startup up to %s", 2*config.Config.AlertManagerTimeout)
	PullFromAlertManager()
	log.Info("Done, starting HTTP server")

	// background loop that will fetch updates from AlertManager
	ticker = time.NewTicker(config.Config.UpdateInterval)
	go Tick()

	switch config.Config.Debug {
	case true:
		gin.SetMode(gin.DebugMode)
	case false:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	prom := ginprometheus.NewPrometheus("gin")
	prom.Use(router)

	if config.Config.Debug {
		ginpprof.Wrapper(router)
	}

	if config.Config.SentryDSN != "" {
		raven.SetRelease(version)
		router.Use(sentry.Recovery(raven.DefaultClient, false))
	}

	router.LoadHTMLGlob("templates/*")

	router.Static("/static", "./static")
	router.StaticFile("/favicon.ico", "./static/favicon.ico")

	router.GET("/", Index)
	router.GET("/help", Help)
	router.GET("/alerts.json", Alerts)
	router.GET("/autocomplete.json", Autocomplete)

	router.Run()
}
