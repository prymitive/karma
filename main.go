package main

import (
	"fmt"
	"html/template"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"

	"github.com/DeanThompson/ginpprof"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/contrib/sentry"
	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"
	"github.com/spf13/pflag"

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

	// used by static file view handlers
	staticFileSystem = newBinaryFileSystem("ui/build")
)

func getViewURL(sub string) string {
	u := path.Join(config.Config.Listen.Prefix, sub)
	if strings.HasSuffix(sub, "/") && !strings.HasSuffix(u, "/") {
		// if sub path had trailing slash then add it here, since path.Join will
		// skip it
		return u + "/"
	}
	return u
}

func setupRouter(router *gin.Engine) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(static.Serve(getViewURL("/"), staticFileSystem))
	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Origin"},
		ExposeHeaders:    []string{"Content-Length"},
	}))

	router.GET(getViewURL("/"), index)
	router.GET(getViewURL("/alerts.json"), alerts)
	router.GET(getViewURL("/autocomplete.json"), autocomplete)
	router.GET(getViewURL("/labelNames.json"), knownLabelNames)
	router.GET(getViewURL("/labelValues.json"), knownLabelValues)
	router.NoRoute(notFound)
}

func setupUpstreams() {
	for _, s := range config.Config.Alertmanager.Servers {

		var httpTransport http.RoundTripper
		var err error
		// if either TLS root CA or client cert is configured then initialize custom transport where we have this setup
		if s.TLS.CA != "" || s.TLS.Cert != "" {
			httpTransport, err = alertmanager.NewHTTPTransport(s.TLS.CA, s.TLS.Cert, s.TLS.Key)
			if err != nil {
				log.Fatalf("Failed to create HTTP transport for Alertmanager '%s' with URI '%s': %s", s.Name, s.URI, err)
			}
		}

		am, err := alertmanager.NewAlertmanager(
			s.Name,
			s.URI,
			alertmanager.WithRequestTimeout(s.Timeout),
			alertmanager.WithProxy(s.Proxy),
			alertmanager.WithHTTPTransport(httpTransport), // we will pass a nil unless TLS.CA or TLS.Cert is set
		)
		if err != nil {
			log.Fatalf("Failed to create Alertmanager '%s' with URI '%s': %s", s.Name, s.URI, err)
		}
		err = alertmanager.RegisterAlertmanager(am)
		if err != nil {
			log.Fatalf("Failed to register Alertmanager '%s' with URI '%s': %s", s.Name, s.URI, err)
		}
	}
}

func setupLogger() {
	switch config.Config.Log.Level {
	case "debug":
		log.SetLevel(log.DebugLevel)
	case "info":
		log.SetLevel(log.InfoLevel)
	case "warning":
		log.SetLevel(log.WarnLevel)
	case "error":
		log.SetLevel(log.ErrorLevel)
	case "fatal":
		log.SetLevel(log.FatalLevel)
	case "panic":
		log.SetLevel(log.PanicLevel)
	default:
		log.Fatalf("Unknown log level '%s'", config.Config.Log.Level)
	}
}

func main() {
	printVersion := pflag.Bool("version", false, "Print version and exit")
	pflag.Parse()
	if *printVersion {
		fmt.Println(version)
		return
	}

	config.Config.Read()
	setupLogger()

	// timer duration cannot be zero second or a negative one
	if config.Config.Alertmanager.Interval <= time.Second*0 {
		log.Fatalf("Invalid AlertmanagerTTL value '%v'", config.Config.Alertmanager.Interval)
	}

	log.Infof("Version: %s", version)
	if config.Config.Log.Config {
		config.Config.LogValues()
	}

	jiraRules := []models.JiraRule{}
	for _, rule := range config.Config.JIRA {
		jiraRules = append(jiraRules, models.JiraRule{Regex: rule.Regex, URI: rule.URI})
	}
	transform.ParseRules(jiraRules)

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	setupUpstreams()

	if len(alertmanager.GetAlertmanagers()) == 0 {
		log.Fatal("No valid Alertmanager URIs defined")
	}

	// before we start try to fetch data from Alertmanager
	log.Info("Initial Alertmanager query")
	pullFromAlertmanager()
	log.Info("Done, starting HTTP server")

	// background loop that will fetch updates from Alertmanager
	ticker = time.NewTicker(config.Config.Alertmanager.Interval)
	go Tick()

	switch config.Config.Debug {
	case true:
		gin.SetMode(gin.DebugMode)
	case false:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	var t *template.Template
	t = loadTemplate(t, "ui/build/index.html")
	router.SetHTMLTemplate(t)

	prom := ginprometheus.NewPrometheus("gin")
	prom.MetricsPath = getViewURL("/metrics")
	prom.Use(router)

	if config.Config.Debug {
		ginpprof.Wrapper(router)
	}

	if config.Config.Sentry.Public != "" {
		raven.SetRelease(version)
		router.Use(sentry.Recovery(raven.DefaultClient, false))
	}

	setupRouter(router)
	for _, am := range alertmanager.GetAlertmanagers() {
		err := setupRouterProxyHandlers(router, am)
		if err != nil {
			log.Fatalf("Failed to setup proxy handlers for Alertmanager '%s': %s", am.Name, err)
		}
	}
	listen := fmt.Sprintf("%s:%d", config.Config.Listen.Address, config.Config.Listen.Port)
	log.Infof("Listening on %s", listen)
	err := router.Run(listen)
	if err != nil {
		log.Fatal(err)
	}
}
