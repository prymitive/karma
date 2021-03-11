package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mapper"

	"github.com/rs/zerolog/log"
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
func NewAlertmanagerProxy(alertmanager *alertmanager.Alertmanager) *httputil.ReverseProxy {
	upstreamURL, _ := url.Parse(alertmanager.URI)
	proxy := httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = upstreamURL.Scheme
			req.URL.Host = upstreamURL.Host

			if upstreamURL.User.Username() != "" {
				username := upstreamURL.User.Username()
				password, _ := upstreamURL.User.Password()
				req.SetBasicAuth(username, password)
			}

			for key, val := range alertmanager.HTTPHeaders {
				req.Header.Set(key, val)
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

			log.Debug().
				Str("alertmanager", alertmanager.Name).
				Str("uri", req.RequestURI).
				Str("forwardedURI", req.URL.String()).
				Msg("Forwarding request")
		},
		Transport: alertmanager.HTTPTransport,
		ModifyResponse: func(resp *http.Response) error {
			// drop Content-Length header from upstream responses, gzip middleware
			// will compress those and that could cause a mismatch
			resp.Header.Del("Content-Length")
			return nil
		},
	}
	return &proxy
}

func handlePostRequest(alertmanager *alertmanager.Alertmanager, h http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Debug().
			Str("alertmanager", alertmanager.Name).
			Str("uri", r.RequestURI).
			Msg("Proxy request")

		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Error().Err(err).
				Str("alertmanager", alertmanager.Name).
				Str("method", r.Method).
				Str("uri", r.RequestURI).
				Msg("Failed to read proxied request")
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		ver := alertmanager.Version()
		m, err := mapper.GetSilenceMapper(ver)
		if err != nil {
			log.Error().Err(err).
				Str("alertmanager", alertmanager.Name).
				Str("method", r.Method).
				Str("uri", r.RequestURI).
				Msg("Failed to proxy a request")
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if len(silenceACLs) > 0 {
			silence, err := m.Unmarshal(body)
			if err != nil {
				log.Error().
					Err(err).
					Str("alertmanager", alertmanager.Name).
					Str("method", r.Method).
					Str("uri", r.RequestURI).
					Msg("Failed to unmarshal silence body")
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			for i, acl := range silenceACLs {
				username := getUserFromContext(r)
				isAllowed, err := acl.isAllowed(alertmanager.Name, silence, username)
				log.Debug().Int("index", i).Bool("allowed", isAllowed).Err(err).Msg("ACL rule check")
				if err != nil {
					log.Warn().Err(err).
						Str("alertmanager", alertmanager.Name).
						Str("method", r.Method).
						Str("uri", r.RequestURI).
						Msg("Proxy request was blocked by ACL rule")
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
				if isAllowed {
					break
				}
			}
		}

		if config.Config.Authentication.Enabled {
			username := getUserFromContext(r)
			newBody, err := m.RewriteUsername(body, username)
			if err != nil {
				log.Error().Err(err).
					Str("alertmanager", alertmanager.Name).
					Str("method", r.Method).
					Str("uri", r.RequestURI).
					Msg("Failed to rewrite silence body")
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			r.Body = io.NopCloser(bytes.NewBuffer(newBody))
			r.ContentLength = int64(len(newBody))
			r.Header.Set("Content-Length", fmt.Sprintf("%d", r.ContentLength))
		} else {
			r.Body = io.NopCloser(bytes.NewBuffer(body))
		}

		h.ServeHTTP(w, r)
	}
}

func setupRouterProxyHandlers(router *chi.Mux, alertmanager *alertmanager.Alertmanager) {
	proxy := NewAlertmanagerProxy(alertmanager)
	router.Post(
		proxyPath(alertmanager.Name, "/api/v2/silences"),
		handlePostRequest(alertmanager, http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)))
	router.Delete(
		proxyPath(alertmanager.Name, "/api/v2/silence/{id}"),
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := http.StripPrefix(proxyPathPrefix(alertmanager.Name), proxy)
			h.ServeHTTP(w, r)
		}))
}
