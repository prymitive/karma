package main

import (
	"path"
	"strings"
	"sync"
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/transform"

	"github.com/DeanThompson/ginpprof"
	log "github.com/Sirupsen/logrus"
	raven "github.com/getsentry/raven-go"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/contrib/sentry"
	"github.com/gin-gonic/gin"
	ginprometheus "github.com/mcuadros/go-gin-prometheus"
	"github.com/patrickmn/go-cache"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	version = "dev"

	// ticker is a timer used by background loop that will keep pulling
	// data from Alertmanager
	ticker *time.Ticker

	// apiCache will be used to keep short lived copy of JSON reponses generated for the UI
	// If there are requests with the same filter we should respond from cache
	// rather than do all the filtering every time
	apiCache *cache.Cache

	// errorLock holds a mutex used to synchronize updates to AlertmanagerError
	// to avoid any race between readers and writers
	errorLock = sync.RWMutex{}
	// alertManagerError holds the description of last error raised when pulling data
	// from Alertmanager, if there was any error
	// This error will be returned in UnseeAlertsResponse and presented by Ui
	alertManagerError string

	metricAlerts = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_collected_alerts",
			Help: "Total number of alerts collected from Alertmanager API",
		},
		[]string{"silenced"},
	)
	metricAlertGroups = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "unsee_collected_groups",
			Help: "Total number of alert groups collected from Alertmanager API",
		},
	)
	metricAlertmanagerErrors = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_alertmanager_errors_total",
			Help: "Total number of errors encounter when requesting data from Alertmanager API",
		},
		[]string{"endpoint"},
	)
)

func init() {
	prometheus.MustRegister(metricAlerts)
	prometheus.MustRegister(metricAlertGroups)
	prometheus.MustRegister(metricAlertmanagerErrors)

	metricAlertmanagerErrors.With(prometheus.Labels{"endpoint": "alerts"}).Set(0)
	metricAlertmanagerErrors.With(prometheus.Labels{"endpoint": "silences"}).Set(0)
}

func getViewURL(sub string) string {
	u := path.Join(config.Config.WebPrefix, sub)
	if strings.HasSuffix(sub, "/") {
		// if sub path had trailing slash then add it here, since path.Join will
		// skip it
		return u + "/"
	}
	return u
}

func setupRouter(router *gin.Engine) {
	router.Use(static.Serve(getViewURL("/static"), newBinaryFileSystem("static")))

	router.GET(getViewURL("/favicon.ico"), favicon)
	router.GET(getViewURL("/"), index)
	router.GET(getViewURL("/help"), help)
	router.GET(getViewURL("/alerts.json"), alerts)
	router.GET(getViewURL("/autocomplete.json"), autocomplete)
}

func main() {
	log.Infof("Version: %s", version)

	config.Config.Read()
	config.Config.LogValues()
	transform.ParseRules(config.Config.JiraRegexp)

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	// before we start try to fetch data from Alertmanager
	log.Infof("Initial Alertmanager query, this can delay startup up to %s", 2*config.Config.AlertmanagerTimeout)
	PullFromAlertmanager()
	log.Info("Done, starting HTTP server")

	// background loop that will fetch updates from Alertmanager
	ticker = time.NewTicker(config.Config.AlertmanagerTTL)
	go Tick()

	switch config.Config.Debug {
	case true:
		gin.SetMode(gin.DebugMode)
	case false:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.SetHTMLTemplate(loadTemplates("templates"))

	prom := ginprometheus.NewPrometheus("gin")
	prom.Use(router)

	if config.Config.Debug {
		ginpprof.Wrapper(router)
	}

	if config.Config.SentryDSN != "" {
		raven.SetRelease(version)
		router.Use(sentry.Recovery(raven.DefaultClient, false))
	}

	setupRouter(router)
	router.Run()
}
