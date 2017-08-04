package main

import (
	"html/template"
	"path"
	"strings"
	"time"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/transform"

	"github.com/DeanThompson/ginpprof"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/contrib/sentry"
	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"

	raven "github.com/getsentry/raven-go"
	ginprometheus "github.com/mcuadros/go-gin-prometheus"
	log "github.com/sirupsen/logrus"
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
)

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

func setupUpstreams() {
	for _, s := range config.Config.AlertmanagerURIs {
		z := strings.SplitN(s, ":", 2)
		if len(z) != 2 {
			log.Fatalf("Invalid Alertmanager URI '%s', expected format 'name:uri'", s)
			continue
		}
		name := z[0]
		uri := z[1]
		err := alertmanager.NewAlertmanager(name, uri, config.Config.AlertmanagerTimeout)
		if err != nil {
			log.Fatalf("Failed to configure Alertmanager '%s' with URI '%s': %s", name, uri, err)
		}
	}
}

func main() {
	log.Infof("Version: %s", version)

	config.Config.Read()

	// timer duration cannot be zero second or a negative one
	if config.Config.AlertmanagerTTL <= time.Second*0 {
		log.Fatalf("Invalid AlertmanagerTTL value '%v'", config.Config.AlertmanagerTTL)
	}

	config.Config.LogValues()
	transform.ParseRules(config.Config.JiraRegexp)

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	setupUpstreams()

	if len(alertmanager.GetAlertmanagers()) == 0 {
		log.Fatal("No valid Alertmanager URIs defined")
	}

	// before we start try to fetch data from Alertmanager
	log.Infof("Initial Alertmanager query, this can delay startup up to %s", 3*config.Config.AlertmanagerTimeout)
	pullFromAlertmanager()
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

	var t *template.Template
	t = loadTemplates(t, "templates")
	t = loadTemplates(t, "static/dist/templates")
	router.SetHTMLTemplate(t)

	prom := ginprometheus.NewPrometheus("gin")
	prom.MetricsPath = getViewURL("/metrics")
	prom.Use(router)

	if config.Config.Debug {
		ginpprof.Wrapper(router)
	}

	if config.Config.SentryDSN != "" {
		raven.SetRelease(version)
		router.Use(sentry.Recovery(raven.DefaultClient, false))
	}

	setupRouter(router)
	err := router.Run()
	if err != nil {
		log.Fatal(err)
	}
}
