package main

import (
	"context"
	"net/http"
	"slices"
	"strings"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/regex"
)

type authUserKey string

func userGroups(username string) []string {
	groups := []string{}
	for _, authGroup := range config.Config.Authorization.Groups {
		if slices.Contains(authGroup.Members, username) {
			groups = append(groups, authGroup.Name)
		}
	}
	return groups
}

func groupsFromHeaders(r *http.Request, groupName, groupValueRegex, groupValueSeparator string) []string {
	groups := []string{}
	groupRegex := regex.MustCompileAnchored(groupValueRegex)
	rawGroups := groupRegex.FindAllStringSubmatch(r.Header.Get(groupName), 1)
	if len(rawGroups) > 0 && len(rawGroups[0]) > 1 {
		for group := range strings.SplitSeq(rawGroups[0][1], groupValueSeparator) {
			if v := strings.TrimSpace(group); v != "" {
				groups = append(groups, v)
			}
		}
	}
	return groups
}

func headerAuth(name, valueRegex, groupName, groupValueRegex, groupValueSeparator string, allowBypass []string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if slices.Contains(allowBypass, r.URL.Path) {
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
			if len(matches) == 0 || len(matches[0]) <= 1 {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte("Access denied\n"))
				return
			}

			userName := matches[0][1]
			groups := userGroups(userName)

			if groupName != "" {
				groups = append(groups, groupsFromHeaders(r, groupName, groupValueRegex, groupValueSeparator)...)
			}

			ctx := context.WithValue(r.Context(), authUserKey("user"), userName)
			ctx = context.WithValue(ctx, authUserKey("groups"), groups)
			next.ServeHTTP(w, r.WithContext(ctx))
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

func getGroupsFromContext(r *http.Request) []string {
	groups := r.Context().Value(authUserKey("groups"))
	if groups == nil {
		return []string{}
	}
	return groups.([]string)
}

func basicAuth(creds map[string]string, groupName, groupValueRegex, groupValueSeparator string, allowBypass []string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if slices.Contains(allowBypass, r.URL.Path) {
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

			groups := userGroups(user)
			if groupName != "" {
				groups = append(groups, groupsFromHeaders(r, groupName, groupValueRegex, groupValueSeparator)...)
			}

			ctx := context.WithValue(r.Context(), authUserKey("user"), user)
			ctx = context.WithValue(ctx, authUserKey("groups"), groups)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func basicAuthFailed(w http.ResponseWriter) {
	w.Header().Add("WWW-Authenticate", `Basic realm="karma"`)
	w.WriteHeader(http.StatusUnauthorized)
}
