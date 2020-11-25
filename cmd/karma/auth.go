package main

import (
	"context"
	"net/http"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/regex"
	"github.com/prymitive/karma/internal/slices"
)

type authUserKey string

func userGroups(username string) []string {
	groups := []string{}
	for _, authGroup := range config.Config.Authorization.Groups {
		if slices.StringInSlice(authGroup.Members, username) {
			groups = append(groups, authGroup.Name)
		}
	}
	return groups
}

func headerAuth(name, valueRegex string, allowBypass []string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if slices.StringInSlice(allowBypass, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			user := r.Header.Get(name)
			if user == "" {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte("Access denied\n"))
				return
			}

			reg := regex.MustCompileAnchored(valueRegex)
			matches := reg.FindAllStringSubmatch(user, 1)
			if len(matches) > 0 && len(matches[0]) > 1 {
				ctx := context.WithValue(r.Context(), authUserKey("user"), matches[0][1])
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Access denied\n"))

		})
	}
}

func getUserFromContext(r *http.Request) string {
	username := r.Context().Value(authUserKey("user"))
	if username == nil {
		return ""
	}
	return username.(string)
}

func basicAuth(creds map[string]string, allowBypass []string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if slices.StringInSlice(allowBypass, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			user, pass, ok := r.BasicAuth()
			if !ok {
				basicAuthFailed(w)
				return
			}

			credPass, credUserOk := creds[user]
			if !credUserOk || pass != credPass {
				basicAuthFailed(w)
				return
			}

			ctx := context.WithValue(r.Context(), authUserKey("user"), user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func basicAuthFailed(w http.ResponseWriter) {
	w.Header().Add("WWW-Authenticate", `Basic realm="karma"`)
	w.WriteHeader(http.StatusUnauthorized)
}
