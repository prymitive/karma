package main

import (
	"compress/flate"
	"context"
	"errors"
	"fmt"
	"html/template"
	"io/ioutil"
	"mime"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	"github.com/loikg/ravenchi"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"

	cache "github.com/patrickmn/go-cache"
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

	indexTemplate *template.Template

	silenceACLs = []*silenceACL{}

	pidFile string
)

func getViewURL(sub string) string {
	var fixedSub string
	fixedSub = sub
	if !strings.HasPrefix(sub, "/") {
		fixedSub = "/" + sub
	}

	var fixedPrefix string
	fixedPrefix = config.Config.Listen.Prefix
	if config.Config.Listen.Prefix != "" && !strings.HasPrefix(config.Config.Listen.Prefix, "/") {
		fixedPrefix = "/" + config.Config.Listen.Prefix
	}

	u := path.Join(fixedPrefix, fixedSub)
	if strings.HasSuffix(fixedSub, "/") && !strings.HasSuffix(u, "/") {
		// if sub path had trailing slash then add it here, since path.Join will
		// skip it
		return u + "/"
	}
	return u
}

func setupRouter(router *chi.Mux) {
	_ = mime.AddExtensionType(".ico", "image/x-icon")

	router.Use(promMiddleware)
	router.Use(ravenchi.SentryRecovery)
	router.Use(middleware.RealIP)

	compressor := middleware.NewCompressor(flate.DefaultCompression)
	router.Use(compressor.Handler)

	router.Use(serverStaticFiles(getViewURL("/"), staticBuildFileSystem))
	// next 2 lines are to allow service raw sources so sentry can fetch source maps
	router.Use(serverStaticFiles(getViewURL("/static/js/"), staticSrcFileSystem))
	// FIXME
	// compressed sources are under /static/js/main.js and reference ../static/js/main.js
	// so we end up with /static/static/js
	router.Use(serverStaticFiles(getViewURL("/static/static/js/"), staticSrcFileSystem))
	router.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			return true
		},
		AllowedMethods:   []string{"GET", "POST", "DELETE"},
		AllowedHeaders:   []string{"Origin"},
		ExposedHeaders:   []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	allowAuthBypass := []string{
		getViewURL("/health"),
		getViewURL("/metrics"),
	}
	if config.Config.Authentication.Header.Name != "" {
		config.Config.Authentication.Enabled = true
		router.Use(headerAuth(config.Config.Authentication.Header.Name, config.Config.Authentication.Header.ValueRegex, allowAuthBypass))
	} else if len(config.Config.Authentication.BasicAuth.Users) > 0 {
		config.Config.Authentication.Enabled = true
		users := map[string]string{}
		for _, u := range config.Config.Authentication.BasicAuth.Users {
			users[u.Username] = u.Password
		}
		router.Use(basicAuth(users, allowAuthBypass))
	}

	router.Get(getViewURL("/"), index)
	router.Get(getViewURL("/health"), pong)
	router.Get(getViewURL("/metrics"), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := promhttp.Handler()
		h.ServeHTTP(w, r)
	}))
	router.Get(getViewURL("/alerts.json"), alerts)
	router.Get(getViewURL("/autocomplete.json"), autocomplete)
	router.Get(getViewURL("/labelNames.json"), knownLabelNames)
	router.Get(getViewURL("/labelValues.json"), knownLabelValues)
	router.Get(getViewURL("/silences.json"), silences)

	router.Get(getViewURL("/custom.css"), serveFileOr404(config.Config.Custom.CSS, "text/css"))
	router.Get(getViewURL("/custom.js"), serveFileOr404(config.Config.Custom.JS, "application/javascript"))

	if config.Config.Debug {
		router.Mount(getViewURL("/debug"), middleware.Profiler())
	}

	for _, am := range alertmanager.GetAlertmanagers() {
		if am.ProxyRequests {
			log.Info().
				Str("alertmanager", am.Name).
				Msg("Setting up proxy endpoints")
			setupRouterProxyHandlers(router, am)
		}
	}

	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Debug().
			Str("method", method).
			Str("route", route).
			Msg("Registered handler")
		return nil
	}
	_ = chi.Walk(router, walkFunc)
}

func setupUpstreams() error {
	for _, s := range config.Config.Alertmanager.Servers {

		if s.Proxy && s.ReadOnly {
			return fmt.Errorf("failed to create Alertmanager '%s' with URI '%s': cannot use proxy and readonly mode at the same time", s.Name, uri.SanitizeURI(s.URI))
		}

		var httpTransport http.RoundTripper
		var err error
		// if either TLS root CA or client cert is configured then initialize custom transport where we have this setup
		if s.TLS.CA != "" || s.TLS.Cert != "" || s.TLS.InsecureSkipVerify {
			httpTransport, err = alertmanager.NewHTTPTransport(s.TLS.CA, s.TLS.Cert, s.TLS.Key, s.TLS.InsecureSkipVerify)
			if err != nil {
				return fmt.Errorf("failed to create HTTP transport for Alertmanager '%s' with URI '%s': %s", s.Name, uri.SanitizeURI(s.URI), err)
			}
		}

		am, err := alertmanager.NewAlertmanager(
			s.Cluster,
			s.Name,
			s.URI,
			alertmanager.WithExternalURI(s.ExternalURI),
			alertmanager.WithRequestTimeout(s.Timeout),
			alertmanager.WithProxy(s.Proxy),
			alertmanager.WithReadOnly(s.ReadOnly),
			alertmanager.WithHTTPTransport(httpTransport), // we will pass a nil unless TLS.CA or TLS.Cert is set
			alertmanager.WithHTTPHeaders(s.Headers),
			alertmanager.WithCORSCredentials(s.CORS.Credentials),
			alertmanager.WithHealthchecks(s.Healthcheck.Filters),
		)
		if err != nil {
			return fmt.Errorf("failed to create Alertmanager '%s' with URI '%s': %s", s.Name, uri.SanitizeURI(s.URI), err)
		}
		err = alertmanager.RegisterAlertmanager(am)
		if err != nil {
			return fmt.Errorf("failed to register Alertmanager '%s' with URI '%s': %s", s.Name, uri.SanitizeURI(s.URI), err)
		}
	}

	return nil
}

func msgFormatter(msg interface{}) string {
	return fmt.Sprintf("msg=%q", msg)
}
func lvlFormatter(level interface{}) string {
	if level == nil {
		return ""
	}
	return fmt.Sprintf("level=%s", level)
}

func initLogger() {
	log.Logger = log.Logger.Output(zerolog.ConsoleWriter{
		Out:           os.Stderr,
		NoColor:       true,
		FormatLevel:   lvlFormatter,
		FormatMessage: msgFormatter,
		FormatTimestamp: func(interface{}) string {
			return ""
		},
	})
}

func setupLogger() error {
	zerolog.DurationFieldUnit = time.Second

	switch config.Config.Log.Format {
	case "text":
		if config.Config.Log.Timestamp {
			log.Logger = log.Logger.Output(zerolog.ConsoleWriter{
				Out:           os.Stderr,
				NoColor:       true,
				FormatLevel:   lvlFormatter,
				FormatMessage: msgFormatter,
				TimeFormat:    "15:04:05",
			})
		}
	case "json":
		if !config.Config.Log.Timestamp {
			log.Logger = zerolog.New(os.Stderr).With().Logger()
		}
	default:
		return fmt.Errorf("unknown log format '%s'", config.Config.Log.Format)
	}

	switch config.Config.Log.Level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warning":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case "fatal":
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	case "panic":
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	default:
		return fmt.Errorf("unknown log level '%s'", config.Config.Log.Level)
	}

	return nil
}

func loadTemplates() error {
	var t *template.Template
	t, err := loadTemplate(t, "ui/build/index.html")
	if err != nil {
		return fmt.Errorf("failed to load template: %s", err)
	}
	indexTemplate = t
	return nil
}

func mainSetup(errorHandling pflag.ErrorHandling) (*chi.Mux, error) {
	f := pflag.NewFlagSet("karma", errorHandling)
	printVersion := f.Bool("version", false, "Print version and exit")
	validateConfig := f.Bool("check-config", false, "Validate configuration and exit")
	f.StringVar(&pidFile, "pid-file", "", "If set PID of karma process will be written to this file")
	config.SetupFlags(f)

	err := f.Parse(os.Args[1:])
	if err != nil {
		return nil, err
	}

	if *printVersion {
		fmt.Println(version)
		return nil, nil
	}

	configFile, err := config.Config.Read(f)
	if err != nil {
		_ = setupLogger()
		return nil, err
	}

	err = setupLogger()
	if err != nil {
		return nil, err
	}

	if configFile != "" {
		log.Info().
			Str("path", configFile).
			Msg("Reading configuration file")
	}

	// timer duration cannot be zero second or a negative one
	if config.Config.Alertmanager.Interval <= time.Second*0 {
		return nil, fmt.Errorf("invalid alertmanager.interval value '%v'", config.Config.Alertmanager.Interval)
	}

	log.Info().Msgf("Version: %s", version)
	if config.Config.Log.Config {
		config.Config.LogValues()
	}

	linkDetectRules := []models.LinkDetectRule{}
	for _, rule := range config.Config.Silences.Comments.LinkDetect.Rules {
		if rule.Regex == "" || rule.URITemplate == "" {
			return nil, fmt.Errorf("invalid link detect rule, regex '%s' uriTemplate '%s'", rule.Regex, rule.URITemplate)
		}
		re, err := regexp.Compile(rule.Regex)
		if err != nil {
			return nil, fmt.Errorf("invalid link detect rule '%s': %s", rule.Regex, err)
		}
		linkDetectRules = append(linkDetectRules, models.LinkDetectRule{Regex: re, URITemplate: rule.URITemplate})
	}
	transform.SetLinkRules(linkDetectRules)

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	err = setupUpstreams()
	if err != nil {
		return nil, err
	}

	if len(alertmanager.GetAlertmanagers()) == 0 {
		return nil, fmt.Errorf("no valid Alertmanager URIs defined")
	}

	if config.Config.Authorization.ACL.Silences != "" {
		log.Info().
			Str("path", config.Config.Authorization.ACL.Silences).
			Msg("Reading silence ACL config file")
		aclConfig, err := config.ReadSilenceACLConfig(config.Config.Authorization.ACL.Silences)
		if err != nil {
			return nil, err
		}

		for i, cfg := range aclConfig.Rules {
			acl, err := newSilenceACLFromConfig(cfg)
			if err != nil {
				return nil, fmt.Errorf("invalid silence ACL rule at position %d: %s", i, err)
			}
			silenceACLs = append(silenceACLs, acl)
		}
		log.Info().Int("rules", len(silenceACLs)).Msg("Parsed ACL rules")
	}

	err = loadTemplates()
	if err != nil {
		return nil, err
	}

	router := chi.NewRouter()

	if config.Config.Sentry.Public != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:     config.Config.Sentry.Public,
			Release: version,
		}); err != nil {
			log.Error().Err(err).Str("dsn", config.Config.Sentry.Public).Msg("Sentry initialization failed")
			return nil, fmt.Errorf("sentry configuration is invalid")
		}
	}

	setupRouter(router)

	if *validateConfig {
		log.Info().Msg("Configuration is valid")
		return nil, nil
	}

	return router, nil
}

func writePidFile() error {
	if pidFile != "" {
		log.Info().Str("path", pidFile).Msg("Writing PID file")
		pid := os.Getpid()
		err := ioutil.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0644)
		if err != nil {
			return fmt.Errorf("failed to write a PID file: %s", err)
		}
	}
	return nil
}

func removePidFile() error {
	if pidFile != "" {
		log.Info().Str("path", pidFile).Msg("Removing PID file")
		err := os.Remove(pidFile)
		if err != nil {
			return fmt.Errorf("failed to remove PID file: %s", err)
		}
	}
	return nil
}

func serve(errorHandling pflag.ErrorHandling) error {
	router, err := mainSetup(errorHandling)
	if err != nil {
		return err
	}
	if router == nil {
		return nil
	}

	err = writePidFile()
	if err != nil {
		return err
	}

	// before we start try to fetch data from Alertmanager
	log.Info().Msg("Initial Alertmanager collection")
	pullFromAlertmanager()
	log.Info().Msg("Done, starting HTTP server")

	// background loop that will fetch updates from Alertmanager
	ticker = time.NewTicker(config.Config.Alertmanager.Interval)
	go Tick()

	listen := fmt.Sprintf("%s:%d", config.Config.Listen.Address, config.Config.Listen.Port)
	listener, err := net.Listen("tcp", listen)
	if err != nil {
		return err
	}

	httpServer := &http.Server{
		Addr:    listen,
		Handler: router,
	}

	quit := make(chan os.Signal, 1)

	if config.Config.Listen.TLS.Cert != "" {
		log.Info().Str("address", listener.Addr().String()).Msg("Starting HTTPS server")
		go func() {
			err := httpServer.ServeTLS(listener, config.Config.Listen.TLS.Cert, config.Config.Listen.TLS.Key)
			if !errors.Is(err, http.ErrServerClosed) {
				log.Error().Err(err).Msg("HTTPS server startup error")
				quit <- syscall.SIGTERM
			}
		}()
	} else {
		log.Info().Str("address", listener.Addr().String()).Msg("Starting HTTP server")
		go func() {
			err := httpServer.Serve(listener)
			if !errors.Is(err, http.ErrServerClosed) {
				log.Error().Err(err).Msg("HTTP server startup error")
				quit <- syscall.SIGTERM
			}
		}()
	}

	signal.Notify(quit, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("Shutting down HTTP server")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown error: %s", err)
	}
	log.Info().Msg("HTTP server shut down")

	return removePidFile()
}

func main() {
	initLogger()
	err := serve(pflag.ExitOnError)
	if err != nil {
		log.Fatal().Err(err).Msg("Execution failed")
	}
}
