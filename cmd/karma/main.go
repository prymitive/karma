package main

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
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
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/spf13/pflag"

	raven "github.com/getsentry/raven-go"
	cache "github.com/patrickmn/go-cache"
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

	staticBuildFileSystem = newBinaryFileSystem("ui/build")
	staticSrcFileSystem   = newBinaryFileSystem("ui/src")
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

func customCSS(c *gin.Context) {
	serveFileOr404(config.Config.Custom.CSS, "text/css", c)
}

func customJS(c *gin.Context) {
	serveFileOr404(config.Config.Custom.JS, "application/javascript", c)
}

func setupRouter(router *gin.Engine) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))

	router.Use(setStaticHeaders(getViewURL("/static/")))
	router.Use(static.Serve(getViewURL("/"), staticBuildFileSystem))
	// next 2 lines are to allow service raw sources so sentry can fetch source maps
	router.Use(static.Serve(getViewURL("/static/js/"), staticSrcFileSystem))
	// FIXME
	// compressed sources are under /static/js/main.js and reference ../static/js/main.js
	// so we end up with /static/static/js
	router.Use(static.Serve(getViewURL("/static/static/js/"), staticSrcFileSystem))
	router.Use(clearStaticHeaders(getViewURL("/static/")))

	router.Use(cors.New(cors.Config{
		// This works different than AllowAllOrigins=true
		// 1. AllowAllOrigins will cause responses to include
		//    'Access-Control-Allow-Origin: *' header in all responses
		// 2. Setting AllowOriginFunc allows to validate origin URI and if it passes
		//    the response will include 'Access-Control-Allow-Origin: $origin'
		//    So the logic is the same, but implementation is different.
		// We need second behavior since setting `credentials: include` on JS
		// fetch() will fail with 'Access-Control-Allow-Origin: *' responses
		AllowOriginFunc: func(origin string) bool {
			return true
		},
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
	router.GET(getViewURL("/silences.json"), silences)

	router.GET(getViewURL("/custom.css"), customCSS)
	router.GET(getViewURL("/custom.js"), customJS)

	router.NoRoute(notFound)
}

func setupMetrics(router *gin.Engine) {
	router.Use(promMiddleware())
	router.GET(getViewURL("/metrics"), promHandler(promhttp.Handler()))
}

func setupUpstreams() {
	for _, s := range config.Config.Alertmanager.Servers {

		var httpTransport http.RoundTripper
		var err error
		// if either TLS root CA or client cert is configured then initialize custom transport where we have this setup
		if s.TLS.CA != "" || s.TLS.Cert != "" || s.TLS.InsecureSkipVerify {
			httpTransport, err = alertmanager.NewHTTPTransport(s.TLS.CA, s.TLS.Cert, s.TLS.Key, s.TLS.InsecureSkipVerify)
			if err != nil {
				log.Fatalf("Failed to create HTTP transport for Alertmanager '%s' with URI '%s': %s", s.Name, s.URI, err)
			}
		}

		am, err := alertmanager.NewAlertmanager(
			s.Name,
			s.URI,
			alertmanager.WithExternalURI(s.ExternalURI),
			alertmanager.WithRequestTimeout(s.Timeout),
			alertmanager.WithProxy(s.Proxy),
			alertmanager.WithHTTPTransport(httpTransport), // we will pass a nil unless TLS.CA or TLS.Cert is set
			alertmanager.WithHTTPHeaders(s.Headers),
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

	switch config.Config.Log.Format {
	case "text":
		log.SetFormatter(&log.TextFormatter{})
	case "json":
		log.SetFormatter(&log.JSONFormatter{})
	default:
		log.Fatalf("Unknown log format '%s'", config.Config.Log.Format)
	}
}

func main() {
	printVersion := pflag.Bool("version", false, "Print version and exit")
	validateConfig := pflag.Bool("check-config", false, "Validate configuration and exit")
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

	if *validateConfig {
		log.Info("Configuration is valid")
		return
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

	setupMetrics(router)

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
	httpServer := &http.Server{
		Addr:    listen,
		Handler: router,
	}

	go func() {
		if err := httpServer.ListenAndServe(); err != nil {
			log.Infof("Listening on %s", listen)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Infof("Shutting down HTTP server")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown failed: %s", err)
	}
	log.Info("HTTP server shut down")
}
