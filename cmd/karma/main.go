package main

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"log/slog"
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
	"github.com/prymitive/karma/internal/log"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"
	"github.com/prymitive/karma/ui"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/klauspost/compress/flate"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/spf13/pflag"
)

var (
	version = "dev"

	// ticker is a timer used by background loop that will keep pulling
	// data from Alertmanager
	ticker *time.Ticker

	// apiCache will be used to keep short lived copy of JSON responses generated for the UI
	// If there are requests with the same filter we should respond from cache
	// rather than do all the filtering every time
	apiCache *lru.Cache[string, []byte]

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

	router.Use(proxyPathFixMiddleware)
	router.Use(promMiddleware)
	router.Use(middleware.RealIP)

	compressor := middleware.NewCompressor(flate.DefaultCompression)
	router.Use(compressor.Handler)

	router.Use(serverStaticFiles(getViewURL("/"), "dist"))
	router.Use(serverStaticFiles(getViewURL("/__test__/"), "mock"))
	corsOptions := cors.Options{
		AllowedOrigins:   config.Config.Listen.Cors.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "DELETE"},
		AllowedHeaders:   []string{"Origin"},
		ExposedHeaders:   []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           300,
	}
	if len(corsOptions.AllowedOrigins) == 0 {
		corsOptions.AllowOriginFunc = func(_ *http.Request, _ string) bool {
			return true
		}
	}
	router.Use(cors.Handler(corsOptions))

	router.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		contentText(w)
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("Not found"))
	})

	allowAuthBypass := []string{
		getViewURL("/health"),
		getViewURL("/metrics"),
		getViewURL("/version"),
	}
	if config.Config.Authentication.Header.Name != "" {
		config.Config.Authentication.Enabled = true
		router.Use(headerAuth(
			config.Config.Authentication.Header.Name,
			config.Config.Authentication.Header.ValueRegex,
			config.Config.Authentication.Header.GroupName,
			config.Config.Authentication.Header.GroupValueRegex,
			config.Config.Authentication.Header.GroupValueSeparator,
			allowAuthBypass,
		))
	} else if len(config.Config.Authentication.BasicAuth.Users) > 0 {
		config.Config.Authentication.Enabled = true
		users := map[string]string{}
		for _, u := range config.Config.Authentication.BasicAuth.Users {
			users[u.Username] = u.Password
		}
		router.Use(basicAuth(
			users,
			config.Config.Authentication.Header.GroupName,
			config.Config.Authentication.Header.GroupValueRegex,
			config.Config.Authentication.Header.GroupValueSeparator,
			allowAuthBypass,
		))
	}

	if config.Config.Listen.Prefix != "/" {
		router.Get(getViewURL(""), redirectIndex)
	}
	router.Get(getViewURL("/"), index)
	router.Get(getViewURL("/version"), versionHandler)
	router.Get(getViewURL("/health"), pong)
	router.Get(getViewURL("/robots.txt"), robots)
	router.Get(getViewURL("/metrics"), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := promhttp.Handler()
		h.ServeHTTP(w, r)
	}))
	router.Post(getViewURL("/alerts.json"), alerts)
	router.Get(getViewURL("/alertList.json"), alertList)
	router.Get(getViewURL("/autocomplete.json"), autocomplete)
	router.Get(getViewURL("/labelNames.json"), knownLabelNames)
	router.Get(getViewURL("/labelValues.json"), knownLabelValues)
	router.Get(getViewURL("/silences.json"), silences)
	router.Get(getViewURL("/counters.json"), counters)
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
			slog.Info("Setting up proxy endpoints", slog.String("alertmanager", am.Name))
			setupRouterProxyHandlers(router, am)
		}
	}

	walkFunc := func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		slog.Debug("Registered handler", slog.String("method", method), slog.String("route", route))
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
				return fmt.Errorf("failed to create HTTP transport for Alertmanager '%s' with URI '%s': %w", s.Name, uri.SanitizeURI(s.URI), err)
			}
		}

		// if a connection proxy address was provided use it to connect to the remote server
		if s.ProxyURL != "" {
			if httpTransport == nil {
				httpTransport = &http.Transport{}
			}
			var proxyURL *url.URL
			proxyURL, err = url.Parse(s.ProxyURL)
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
			return fmt.Errorf("failed to create Alertmanager '%s' with URI '%s': %w", s.Name, uri.SanitizeURI(s.URI), err)
		}
		err = alertmanager.RegisterAlertmanager(am)
		if err != nil {
			return fmt.Errorf("failed to register Alertmanager '%s' with URI '%s': %w", s.Name, uri.SanitizeURI(s.URI), err)
		}
	}

	return nil
}

func setupLogger() error {
	level, err := log.ParseLevel(config.Config.Log.Level)
	if err != nil {
		return err
	}
	log.SetLevel(level)

	return log.SetupLogger(config.Config.Log.Format, config.Config.Log.Timestamp)
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
		slog.Info("Reading configuration file", slog.String("path", configFile))
	}

	// timer duration cannot be zero second or a negative one
	if config.Config.Alertmanager.Interval <= time.Second*0 {
		return nil, nil, fmt.Errorf("invalid alertmanager.interval value '%v'", config.Config.Alertmanager.Interval)
	}

	slog.Info("Version: " + version)
	if config.Config.Log.Config {
		config.Config.LogValues()
	}

	linkDetectRules := make([]models.LinkDetectRule, 0, len(config.Config.Silences.Comments.LinkDetect.Rules))
	var re *regexp.Regexp
	for _, rule := range config.Config.Silences.Comments.LinkDetect.Rules {
		if rule.Regex == "" || rule.URITemplate == "" {
			return nil, nil, fmt.Errorf("invalid link detect rule, regex '%s' uriTemplate '%s'", rule.Regex, rule.URITemplate)
		}
		re, err = regexp.Compile(rule.Regex)
		if err != nil {
			return nil, nil, fmt.Errorf("invalid link detect rule '%s': %w", rule.Regex, err)
		}
		linkDetectRules = append(linkDetectRules, models.LinkDetectRule{Regex: re, URITemplate: rule.URITemplate})
	}
	transform.SetLinkRules(linkDetectRules)

	apiCache, _ = lru.New[string, []byte](1024)

	err = setupUpstreams()
	if err != nil {
		return nil, nil, err
	}

	if config.Config.Authorization.ACL.Silences != "" {
		slog.Info("Reading silence ACL config file", slog.String("path", config.Config.Authorization.ACL.Silences))
		var aclConfig *config.SilencesACLSchema
		aclConfig, err = config.ReadSilenceACLConfig(config.Config.Authorization.ACL.Silences)
		if err != nil {
			return nil, nil, err
		}

		var acl *silenceACL
		for i, cfg := range aclConfig.Rules {
			acl, err = newSilenceACLFromConfig(cfg)
			if err != nil {
				return nil, nil, fmt.Errorf("invalid silence ACL rule at position %d: %w", i, err)
			}
			silenceACLs = append(silenceACLs, acl)
		}
		slog.Info("Parsed ACL rules", slog.Int("rules", len(silenceACLs)))
	}

	indexTemplate, _ = template.ParseFS(ui.StaticFiles, "dist/index.html")

	router := chi.NewRouter()

	historyPoller := newHistoryPoller(100, config.Config.History.Timeout)
	setupRouter(router, historyPoller)

	if *validateConfig {
		slog.Info("Configuration is valid")
		return nil, nil, nil
	}

	return router, historyPoller, nil
}

func writePidFile() error {
	if pidFile != "" {
		slog.Info("Writing PID file", slog.String("path", pidFile))
		pid := os.Getpid()
		err := os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0o644)
		if err != nil {
			return fmt.Errorf("failed to write a PID file: %w", err)
		}
	}
	return nil
}

func removePidFile() error {
	if pidFile != "" {
		slog.Info("Removing PID file", slog.String("path", pidFile))
		err := os.Remove(pidFile)
		if err != nil {
			return fmt.Errorf("failed to remove PID file: %w", err)
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
	slog.Info("Initial Alertmanager collection")
	pullFromAlertmanager()
	slog.Info("Done, starting HTTP server")

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
		slog.Info("Starting HTTPS server", slog.String("address", listener.Addr().String()))
		go func() {
			err := httpServer.ServeTLS(listener, config.Config.Listen.TLS.Cert, config.Config.Listen.TLS.Key)
			if !errors.Is(err, http.ErrServerClosed) {
				slog.Error("HTTPS server startup error", slog.Any("error", err))
				quit <- syscall.SIGTERM
			}
		}()
	} else {
		slog.Info("Starting HTTP server", slog.String("address", listener.Addr().String()))
		go func() {
			err := httpServer.Serve(listener)
			if !errors.Is(err, http.ErrServerClosed) {
				slog.Error("HTTP server startup error", slog.Any("error", err))
				quit <- syscall.SIGTERM
			}
		}()
	}

	signal.Notify(quit, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	s := <-quit
	slog.Info("Shutting down HTTP server", slog.Any("signal", s))

	historyPoller.stop()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		_ = removePidFile()
		return fmt.Errorf("shutdown error: %w", err)
	}

	slog.Info("HTTP server shut down")
	return removePidFile()
}

func main() {
	_ = log.SetupLogger("text", false)
	err := serve(pflag.ExitOnError)
	if err != nil {
		slog.Error("Execution failed", slog.Any("error", err))
		os.Exit(1)
	}
}
