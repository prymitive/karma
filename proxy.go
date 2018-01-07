package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/cloudflare/unsee/internal/alertmanager"
	"github.com/cloudflare/unsee/internal/config"
	"github.com/gin-gonic/gin"

	log "github.com/sirupsen/logrus"
)

func proxyPathPrefix(name string) string {
	return fmt.Sprintf("%sproxy/alertmanager/%s", config.Config.Listen.Prefix, name)
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
			// drop Accept-Encoding header so we always get uncompressed reponses from
			// upstream, there's a gzip middleware that's global so we don't want it
			// to gzip twice
			req.Header.Del("Accept-Encoding")
			log.Debugf("[%s] Proxy request for %s", alertmanager.Name, req.URL.Path)
		},
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
		fmt.Sprintf("%s/api/v1/silences", proxyPathPrefix(alertmanager.Name)),
		gin.WrapH(http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	router.DELETE(
		fmt.Sprintf("%s/api/v1/silence/*id", proxyPathPrefix(alertmanager.Name)),
		gin.WrapH(http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	return nil
}
