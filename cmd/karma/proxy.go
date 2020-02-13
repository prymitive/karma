package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"

	log "github.com/sirupsen/logrus"
)

func proxyPathPrefix(name string) string {
	maybeSlash := ""
	if !strings.HasSuffix(config.Config.Listen.Prefix, "/") {
		maybeSlash = "/"
	}
	return fmt.Sprintf("%s%sproxy/alertmanager/%s", config.Config.Listen.Prefix, maybeSlash, name)
}

func proxyPath(name, path string) string {
	return fmt.Sprintf("%s%s", proxyPathPrefix(name), path)
}

// NewAlertmanagerProxy creates a proxy instance for given alertmanager instance
func NewAlertmanagerProxy(alertmanager *alertmanager.Alertmanager) (*httputil.ReverseProxy, error) {
	upstreamURL, err := url.Parse(alertmanager.URI)
	if err != nil {
		return nil, err
	}
	proxy := httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = upstreamURL.Scheme
			req.URL.Host = upstreamURL.Host

			if upstreamURL.User.Username() != "" {
				username := upstreamURL.User.Username()
				password, _ := upstreamURL.User.Password()
				req.SetBasicAuth(username, password)
			}

			// drop Accept-Encoding header so we always get uncompressed reponses from
			// upstream, there's a gzip middleware that's global so we don't want it
			// to gzip twice
			req.Header.Del("Accept-Encoding")

			// set hostname of proxied target
			req.Host = upstreamURL.Host

			// Prepend with upstream URL path if exists
			if len(upstreamURL.Path) > 0 {
				req.URL.Path = strings.TrimSuffix(upstreamURL.Path, "/") + req.URL.Path
			}

			log.Debugf("[%s] Proxy request for %s", alertmanager.Name, req.URL.Path)
		},
		Transport: alertmanager.HTTPTransport,
		ModifyResponse: func(resp *http.Response) error {
			// drop Content-Length header from upstream responses, gzip middleware
			// will compress those and that could cause a mismatch
			resp.Header.Del("Content-Length")
			return nil
		},
	}
	return &proxy, nil
}

func setupRouterProxyHandlers(router *gin.Engine, alertmanager *alertmanager.Alertmanager) error {
	proxy, err := NewAlertmanagerProxy(alertmanager)
	if err != nil {
		return err
	}
	router.POST(
		proxyPath(alertmanager.Name, "/api/v2/silences"),
		gin.WrapH(http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	router.DELETE(
		proxyPath(alertmanager.Name, "/api/v2/silence/*id"),
		gin.WrapH(http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	return nil
}
