package main

import (
	"compress/flate"
	"context"
	"errors"
	"fmt"
	"html/template"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"
	"github.com/prymitive/karma/ui"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	lru "github.com/hashicorp/golang-lru"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
)

var (
	version = "dev"

	// ticker is a timer used by background loop that will keep pulling
	// data from Alertmanager
	ticker *time.Ticker

	// apiCache will be used to keep short lived copy of JSON reponses generated for the UI
	// If there are requests with the same filter we should respond from cache
	// rather than do all the filtering every time
	apiCache *lru.Cache

	indexTemplate *template.Template

	silenceACLs = []*silenceACL{}

	pidFile string
)

func getViewURL(sub string) string {
	var fixedSub string
	fixedSub = sub
	if sub != "" && !strings.HasPrefix(sub, "/") {
		fixedSub = "/" + sub
	}

	var fixedPrefix string
	fixedPrefix = strings.TrimPrefix(config.Config.Listen.Prefix, "/")
	fixedPrefix = strings.TrimSuffix(fixedPrefix, "/")
	fixedPrefix = "/" + fixedPrefix + "/"

	u := path.Join(fixedPrefix, fixedSub)
	if strings.HasSuffix(fixedSub, "/") && !strings.HasSuffix(u, "/") {
		// if sub path had trailing slash then add it here, since path.Join will
		// skip it
		return u + "/"
	}
	return u
}

func setupRouter(router *chi.Mux, historyPoller *historyPoller) {
	_ = mime.AddExtensionType(".ico", "image/x-icon")

	sentryMiddleware := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})

	router.Use(promMiddleware)
	router.Use(sentryMiddleware.Handle)
	router.Use(middleware.RealIP)

	compressor := middleware.NewCompressor(flate.DefaultCompression)
	router.Use(compressor.Handler)

	router.Use(serverStaticFiles(getViewURL("/"), "build"))
	// next 2 lines are to allow service raw sources so sentry can fetch source maps
	router.Use(serverStaticFiles(getViewURL("/static/js/"), "src"))
	// FIXME
	// compressed sources are under /static/js/main.js and reference ../static/js/main.js
	// so we end up with /static/static/js
	router.Use(serverStaticFiles(getViewURL("/static/static/js/"), "src"))
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

	if config.Config.Listen.Prefix != "/" {
		router.Get(getViewURL(""), redirectIndex)
	}
	router.Get(getViewURL("/"), index)
	router.Get(getViewURL("/health"), pong)
	router.Get(getViewURL("/robots.txt"), robots)
	router.Get(getViewURL("/metrics"), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := promhttp.Handler()
		h.ServeHTTP(w, r)
	}))
	router.Get(getViewURL("/alerts.json"), alerts)
	router.Get(getViewURL("/autocomplete.json"), autocomplete)
	router.Get(getViewURL("/labelNames.json"), knownLabelNames)
	router.Get(getViewURL("/labelValues.json"), knownLabelValues)
	router.Get(getViewURL("/silences.json"), silences)
	router.Post(getViewURL("/history.json"), func(w http.ResponseWriter, r *http.Request) {
		alertHistory(historyPoller, w, r)
	})

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

		// if a connection proxy address was provided use it to connect to the remote server
		if s.ProxyURL != "" {
			if httpTransport == nil {
				httpTransport = &http.Transport{}
			}
			proxyURL, err := url.Parse(s.ProxyURL)
			if err != nil {
				return fmt.Errorf("failed to parse provided proxy url %q: %w", s.ProxyURL, err)
			}
			httpTransport.(*http.Transport).Proxy = http.ProxyURL(proxyURL)
		}

		am, err := alertmanager.NewAlertmanager(
			s.Cluster,
			s.Name,
			s.URI,
			alertmanager.WithExternalURI(s.ExternalURI),
			alertmanager.WithRequestTimeout(s.Timeout),
			alertmanager.WithProxy(s.Proxy),
			alertmanager.WithReadOnly(s.ReadOnly),
			alertmanager.WithHTTPTransport(httpTransport), // we will pass a nil unless TLS.CA, TLS.Cert or ProxyURL is set
			alertmanager.WithHTTPHeaders(s.Headers),
			alertmanager.WithCORSCredentials(s.CORS.Credentials),
			alertmanager.WithHealthchecks(s.Healthcheck.Filters),
			alertmanager.WithHealthchecksVisible(s.Healthcheck.Visible),
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
	t, err := template.ParseFS(ui.StaticFiles, "build/index.html")
	if err != nil {
		return fmt.Errorf("failed to load template: %s", err)
	}
	indexTemplate = t
	return nil
}

func mainSetup(errorHandling pflag.ErrorHandling) (*chi.Mux, *historyPoller, error) {
	f := pflag.NewFlagSet("karma", errorHandling)
	printVersion := f.Bool("version", false, "Print version and exit")
	validateConfig := f.Bool("check-config", false, "Validate configuration and exit")
	f.StringVar(&pidFile, "pid-file", "", "If set PID of karma process will be written to this file")
	config.SetupFlags(f)

	err := f.Parse(os.Args[1:])
	if err != nil {
		return nil, nil, err
	}

	if *printVersion {
		fmt.Println(version)
		return nil, nil, nil
	}

	configFile, err := config.Config.Read(f)
	if err != nil {
		_ = setupLogger()
		return nil, nil, err
	}

	err = setupLogger()
	if err != nil {
		return nil, nil, err
	}

	if configFile != "" {
		log.Info().
			Str("path", configFile).
			Msg("Reading configuration file")
	}

	// timer duration cannot be zero second or a negative one
	if config.Config.Alertmanager.Interval <= time.Second*0 {
		return nil, nil, fmt.Errorf("invalid alertmanager.interval value '%v'", config.Config.Alertmanager.Interval)
	}

	log.Info().Msgf("Version: %s", version)
	if config.Config.Log.Config {
		config.Config.LogValues()
	}

	linkDetectRules := []models.LinkDetectRule{}
	for _, rule := range config.Config.Silences.Comments.LinkDetect.Rules {
		if rule.Regex == "" || rule.URITemplate == "" {
			return nil, nil, fmt.Errorf("invalid link detect rule, regex '%s' uriTemplate '%s'", rule.Regex, rule.URITemplate)
		}
		re, err := regexp.Compile(rule.Regex)
		if err != nil {
			return nil, nil, fmt.Errorf("invalid link detect rule '%s': %s", rule.Regex, err)
		}
		linkDetectRules = append(linkDetectRules, models.LinkDetectRule{Regex: re, URITemplate: rule.URITemplate})
	}
	transform.SetLinkRules(linkDetectRules)

	apiCache, _ = lru.New(1024)

	err = setupUpstreams()
	if err != nil {
		return nil, nil, err
	}

	if len(alertmanager.GetAlertmanagers()) == 0 {
		return nil, nil, fmt.Errorf("no valid Alertmanager URIs defined")
	}

	if config.Config.Authorization.ACL.Silences != "" {
		log.Info().
			Str("path", config.Config.Authorization.ACL.Silences).
			Msg("Reading silence ACL config file")
		aclConfig, err := config.ReadSilenceACLConfig(config.Config.Authorization.ACL.Silences)
		if err != nil {
			return nil, nil, err
		}

		for i, cfg := range aclConfig.Rules {
			acl, err := newSilenceACLFromConfig(cfg)
			if err != nil {
				return nil, nil, fmt.Errorf("invalid silence ACL rule at position %d: %s", i, err)
			}
			silenceACLs = append(silenceACLs, acl)
		}
		log.Info().Int("rules", len(silenceACLs)).Msg("Parsed ACL rules")
	}

	err = loadTemplates()
	if err != nil {
		return nil, nil, err
	}

	router := chi.NewRouter()

	if config.Config.Sentry.Public != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:     config.Config.Sentry.Public,
			Release: version,
		}); err != nil {
			log.Error().Err(err).Str("dsn", config.Config.Sentry.Public).Msg("Sentry initialization failed")
			return nil, nil, fmt.Errorf("sentry configuration is invalid")
		}
		log.Info().Msg("Sentry enabled")
		defer sentry.Flush(time.Second)
	}

	historyPoller := newHistoryPoller(100, config.Config.History.Timeout)
	setupRouter(router, historyPoller)

	if *validateConfig {
		log.Info().Msg("Configuration is valid")
		return nil, nil, nil
	}

	return router, historyPoller, nil
}

func writePidFile() error {
	if pidFile != "" {
		log.Info().Str("path", pidFile).Msg("Writing PID file")
		pid := os.Getpid()
		err := os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0644)
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
	router, historyPoller, err := mainSetup(errorHandling)
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

	if config.Config.History.Enabled {
		go historyPoller.run(config.Config.History.Workers)
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
		Addr:         listen,
		Handler:      router,
		ReadTimeout:  config.Config.Listen.Timeout.Read,
		WriteTimeout: config.Config.Listen.Timeout.Write,
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

	historyPoller.stop()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		_ = removePidFile()
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
