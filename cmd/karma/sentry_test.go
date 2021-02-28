package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestSentryRecovery(t *testing.T) {
	r := chi.NewRouter()
	r.Use(sentryRecovery)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		panic("catched")
	})

	req := httptest.NewRequest("GET", "/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusInternalServerError {
		t.Errorf("GET / returned status %d", resp.Code)
	}
}

func TestSentryRecoveryWithError(t *testing.T) {
	r := chi.NewRouter()
	r.Use(sentryRecovery)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		panic(errors.New("catched error"))
	})

	req := httptest.NewRequest("GET", "/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusInternalServerError {
		t.Errorf("GET / returned status %d", resp.Code)
	}
}
