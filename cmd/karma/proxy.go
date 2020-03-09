package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mapper"

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
	return fmt.Sprintf("/proxy/alertmanager/%s%s", name, path)
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

			log.Debugf("[%s] Forwarding request for %s to %s", alertmanager.Name, req.RequestURI, req.URL.String())
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

func handlePostRequest(alertmanager *alertmanager.Alertmanager, h http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Debugf("[%s] Proxy request %s", alertmanager.Name, c.Request.RequestURI)

		body, err := ioutil.ReadAll(c.Request.Body)
		c.Request.Body.Close()
		if err != nil {
			log.Errorf("[%s] proxy request '%s %s' body close failed: %s", alertmanager.Name, c.Request.Method, c.Request.RequestURI, err)
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		ver := alertmanager.Version()
		if ver == "" {
			ver = "999.0"
		}

		m, err := mapper.GetSilenceMapper(ver)
		if err != nil {
			log.Errorf("[%s] proxy request '%s %s' error: %s", alertmanager.Name, c.Request.Method, c.Request.RequestURI, err)
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		silence, err := m.Unmarshal(body)
		if err != nil {
			log.Errorf("[%s] proxy request '%s %s' failed to unmarshal silence body: %s", alertmanager.Name, c.Request.Method, c.Request.RequestURI, err)
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		for i, acl := range silenceACLs {
			username := c.GetString(gin.AuthUserKey)
			isAllowed, err := acl.isAllowed(alertmanager.Name, silence, username)
			log.Debugf("ACL %d: isAllowed=%v err=%v", i, isAllowed, err)
			if err != nil {
				log.Warningf("[%s] proxy request '%s %s' was blocked by ACL rule: %s", alertmanager.Name, c.Request.Method, c.Request.RequestURI, err)
				c.String(http.StatusBadRequest, err.Error())
				return
			}
			if isAllowed {
				break
			}
		}

		if config.Config.Authentication.Enabled {
			username := c.MustGet(gin.AuthUserKey).(string)
			newBody, err := m.RewriteUsername(body, username)
			if err != nil {
				log.Errorf("[%s] proxy request '%s %s' silence body rewrite error: %s", alertmanager.Name, c.Request.Method, c.Request.RequestURI, err)
				c.String(http.StatusInternalServerError, err.Error())
				return
			}

			c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(newBody))
			c.Request.ContentLength = int64(len(newBody))
			c.Request.Header.Set("Content-Length", fmt.Sprintf("%d", c.Request.ContentLength))
		} else {
			c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(body))
		}

		h.ServeHTTP(c.Writer, c.Request)
	}
}

func setupRouterProxyHandlers(router *gin.Engine, alertmanager *alertmanager.Alertmanager) error {
	proxy, err := NewAlertmanagerProxy(alertmanager)
	if err != nil {
		return err
	}

	protectedEndpoints.POST(
		proxyPath(alertmanager.Name, "/api/v2/silences"),
		handlePostRequest(alertmanager, http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	protectedEndpoints.DELETE(
		proxyPath(alertmanager.Name, "/api/v2/silence/*id"),
		gin.WrapH(http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	return nil
}
