package main

import (
	"context"
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

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/regex"
	"github.com/prymitive/karma/internal/transform"
	"github.com/prymitive/karma/internal/uri"

	"github.com/DeanThompson/ginpprof"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/contrib/sentry"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"

	raven "github.com/getsentry/raven-go"
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

	protectedEndpoints *gin.RouterGroup

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

func customCSS(c *gin.Context) {
	serveFileOr404(config.Config.Custom.CSS, "text/css", c)
}

func customJS(c *gin.Context) {
	serveFileOr404(config.Config.Custom.JS, "application/javascript", c)
}

func headerAuth(name, valueRegex string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Request.Header.Get(name)
		if user == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		r := regex.MustCompileAnchored(valueRegex)
		matches := r.FindAllStringSubmatch(user, 1)
		if len(matches) > 0 && len(matches[0]) > 1 {
			c.Set(gin.AuthUserKey, matches[0][1])
		} else {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
	}
}

func setupRouter(router *gin.Engine) {
	_ = mime.AddExtensionType(".ico", "image/x-icon")

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

	if config.Config.Authentication.Header.Name != "" {
		config.Config.Authentication.Enabled = true
		protectedEndpoints = router.Group(getViewURL("/"),
			headerAuth(config.Config.Authentication.Header.Name, config.Config.Authentication.Header.ValueRegex))
	} else if len(config.Config.Authentication.BasicAuth.Users) > 0 {
		config.Config.Authentication.Enabled = true
		users := map[string]string{}
		for _, u := range config.Config.Authentication.BasicAuth.Users {
			users[u.Username] = u.Password
		}
		protectedEndpoints = router.Group(getViewURL("/"), gin.BasicAuth(users))
	} else {
		protectedEndpoints = router.Group(getViewURL("/"))
	}

	router.GET(getViewURL("/health"), pong)

	protectedEndpoints.GET("/", index)
	protectedEndpoints.GET("/alerts.json", alerts)
	protectedEndpoints.GET("/autocomplete.json", autocomplete)
	protectedEndpoints.GET("/labelNames.json", knownLabelNames)
	protectedEndpoints.GET("/labelValues.json", knownLabelValues)
	protectedEndpoints.GET("/silences.json", silences)

	protectedEndpoints.GET("/custom.css", customCSS)
	protectedEndpoints.GET("/custom.js", customJS)

	router.NoRoute(notFound)
}

func setupMetrics(router *gin.Engine) {
	router.Use(promMiddleware())
	router.GET(getViewURL("/metrics"), promHandler(promhttp.Handler()))
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

func mainSetup(errorHandling pflag.ErrorHandling) (*gin.Engine, error) {
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
		log.Info().Str("path", configFile).Msg("Reading configuration file")
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
		log.Info().Str("path", config.Config.Authorization.ACL.Silences).Msg("Reading silence ACL config file")
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

	switch config.Config.Debug {
	case true:
		gin.SetMode(gin.DebugMode)
	case false:
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	var t *template.Template
	t, err = loadTemplate(t, "ui/build/index.html")
	if err != nil {
		return nil, fmt.Errorf("failed to load template: %s", err)
	}
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
		if am.ProxyRequests {
			log.Info().Str("alertmanager", am.Name).Msg("Setting up proxy endpoints")
			err := setupRouterProxyHandlers(router, am)
			if err != nil {
				return nil, fmt.Errorf("failed to setup proxy handlers for Alertmanager '%s': %s", am.Name, err)
			}
		}
	}

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
	log.Info().Str("address", listener.Addr().String()).Msg("Starting HTTP server")

	httpServer := &http.Server{
		Addr:    listen,
		Handler: router,
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("Shutting down HTTP server")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
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
