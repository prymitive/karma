package v017

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	json "github.com/go-json-experiment/json"
	"github.com/go-json-experiment/json/jsontext"
)

func TestDateTimeUnmarshalJSONFromValid(t *testing.T) {
	// verifies that a valid RFC3339 timestamp is parsed correctly
	var dt dateTime
	err := json.Unmarshal([]byte(`"2025-03-10T12:00:00.000Z"`), &dt)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := time.Date(2025, 3, 10, 12, 0, 0, 0, time.UTC)
	if !time.Time(dt).Equal(expected) {
		t.Errorf("got %v, want %v", time.Time(dt), expected)
	}
}

func TestDateTimeUnmarshalJSONFromInvalidJSON(t *testing.T) {
	// verifies that broken JSON input returns a read error
	var dt dateTime
	err := json.Unmarshal([]byte(`{not json`), &dt)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestDateTimeUnmarshalJSONFromInvalidTimestamp(t *testing.T) {
	// verifies that a string that is not a valid RFC3339 timestamp returns a parse error
	var dt dateTime
	err := json.Unmarshal([]byte(`"not-a-date"`), &dt)
	if err == nil {
		t.Fatal("expected error for invalid timestamp, got nil")
	}
}

func TestDateTimeUnmarshalJSONFromNonString(t *testing.T) {
	// verifies that a non-string JSON value (number) returns an unquote error
	var dt dateTime
	err := json.Unmarshal([]byte(`12345`), &dt)
	if err == nil {
		t.Fatal("expected error for non-string JSON value, got nil")
	}
}

func TestDateTimeMarshalRoundTrip(t *testing.T) {
	// verifies that marshal then unmarshal produces the same time
	original := dateTime(time.Date(2025, 6, 15, 8, 30, 0, 0, time.UTC))
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var decoded dateTime
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if !time.Time(original).Equal(time.Time(decoded)) {
		t.Errorf("round-trip mismatch: got %v, want %v", time.Time(decoded), time.Time(original))
	}
}

func TestJsonLabelsUnmarshalValid(t *testing.T) {
	// verifies that a valid JSON object is decoded into labels
	var jl jsonLabels
	err := json.Unmarshal([]byte(`{"alertname":"TestAlert","job":"test"}`), &jl)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if jl.ls.Get("alertname") != "TestAlert" {
		t.Errorf("alertname = %q, want %q", jl.ls.Get("alertname"), "TestAlert")
	}
	if jl.ls.Get("job") != "test" {
		t.Errorf("job = %q, want %q", jl.ls.Get("job"), "test")
	}
}

func TestJsonLabelsUnmarshalInvalidJSON(t *testing.T) {
	// verifies that broken JSON returns an error from the opening token read
	var jl jsonLabels
	err := json.Unmarshal([]byte(`not json`), &jl)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestJsonLabelsUnmarshalTruncatedKey(t *testing.T) {
	// verifies that a truncated object (missing value after key) returns an error
	var jl jsonLabels
	err := json.Unmarshal([]byte(`{"key":`), &jl)
	if err == nil {
		t.Fatal("expected error for truncated key/value, got nil")
	}
}

func TestJsonAnnotationsUnmarshalValid(t *testing.T) {
	// verifies that a valid JSON object is decoded into sorted annotations
	var ja jsonAnnotations
	err := json.Unmarshal([]byte(`{"summary":"test summary","description":"test desc"}`), &ja)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(ja.annos) != 2 {
		t.Fatalf("got %d annotations, want 2", len(ja.annos))
	}
	names := make(map[string]bool)
	for _, a := range ja.annos {
		names[a.Name] = true
	}
	if !names["summary"] {
		t.Error("missing annotation 'summary'")
	}
	if !names["description"] {
		t.Error("missing annotation 'description'")
	}
}

func TestJsonAnnotationsUnmarshalInvalidJSON(t *testing.T) {
	// verifies that broken JSON returns an error from the opening token read
	var ja jsonAnnotations
	err := json.Unmarshal([]byte(`not json`), &ja)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestJsonAnnotationsUnmarshalTruncatedKey(t *testing.T) {
	// verifies that a truncated object (missing value after key) returns an error
	var ja jsonAnnotations
	err := json.Unmarshal([]byte(`{"key":`), &ja)
	if err == nil {
		t.Fatal("expected error for truncated key/value, got nil")
	}
}

func TestJsonLabelsUnmarshalTruncatedAfterOpen(t *testing.T) {
	// verifies that EOF right after the opening brace returns an error from the key ReadToken
	var jl jsonLabels
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{`)))
	err := jl.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for truncated object after open brace, got nil")
	}
}

func TestJsonLabelsUnmarshalTruncatedValue(t *testing.T) {
	// verifies that a truncated value after a valid key returns an error from the value ReadToken
	var jl jsonLabels
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{"key": `)))
	err := jl.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for truncated value, got nil")
	}
}

func TestJsonLabelsUnmarshalTruncatedClose(t *testing.T) {
	// verifies that a missing closing brace after valid key-value pairs returns an error
	var jl jsonLabels
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{"key": "val"`)))
	err := jl.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for missing closing brace, got nil")
	}
}

func TestJsonAnnotationsUnmarshalTruncatedAfterOpen(t *testing.T) {
	// verifies that EOF right after the opening brace returns an error from the key ReadToken
	var ja jsonAnnotations
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{`)))
	err := ja.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for truncated object after open brace, got nil")
	}
}

func TestJsonAnnotationsUnmarshalTruncatedValue(t *testing.T) {
	// verifies that a truncated value after a valid key returns an error from the value ReadToken
	var ja jsonAnnotations
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{"key": `)))
	err := ja.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for truncated value, got nil")
	}
}

func TestJsonAnnotationsUnmarshalTruncatedClose(t *testing.T) {
	// verifies that a missing closing brace after valid key-value pairs returns an error
	var ja jsonAnnotations
	dec := jsontext.NewDecoder(bytes.NewReader([]byte(`{"key": "val"`)))
	err := ja.UnmarshalJSONFrom(dec)
	if err == nil {
		t.Fatal("expected error for missing closing brace, got nil")
	}
}

func TestApiGetNon200(t *testing.T) {
	// verifies that a non-200 HTTP response returns an error with the status code
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	_, err := apiGet(context.Background(), srv.Client(), u, "alerts/groups")
	if err == nil {
		t.Fatal("expected error for non-200 status, got nil")
	}
}

func TestApiGetRequestError(t *testing.T) {
	// verifies that a connection error (server closed) returns an error
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {}))
	u, _ := url.Parse(srv.URL)
	srv.Close()

	_, err := apiGet(context.Background(), srv.Client(), u, "alerts/groups")
	if err == nil {
		t.Fatal("expected error for closed server, got nil")
	}
}

func TestApiGetInvalidURL(t *testing.T) {
	// verifies that an invalid URL that causes NewRequestWithContext to fail returns an error
	u := &url.URL{Scheme: "http", Host: "invalid host with spaces"}
	_, err := apiGet(context.Background(), http.DefaultClient, u, "alerts/groups")
	if err == nil {
		t.Fatal("expected error for invalid URL, got nil")
	}
}

func TestGroupsInvalidJSON(t *testing.T) {
	// verifies that invalid JSON in the groups response returns a decode error
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	_, err := groups(srv.Client(), u, 5*time.Second)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestGroupsValid(t *testing.T) {
	// verifies that a valid groups JSON response is decoded correctly
	payload := `[{
		"labels": {"alertname": "TestAlert"},
		"receiver": {"name": "default"},
		"alerts": [{
			"startsAt": "2025-03-10T12:00:00.000Z",
			"annotations": {"summary": "test"},
			"labels": {"alertname": "TestAlert", "job": "test"},
			"fingerprint": "abc123",
			"generatorURL": "http://prom:9090",
			"status": {
				"state": "active",
				"inhibitedBy": [],
				"silencedBy": []
			}
		}]
	}]`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(payload))
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	result, err := groups(srv.Client(), u, 5*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("got %d groups, want 1", len(result))
	}
	if result[0].Receiver != "default" {
		t.Errorf("receiver = %q, want %q", result[0].Receiver, "default")
	}
	if len(result[0].Alerts) != 1 {
		t.Fatalf("got %d alerts, want 1", len(result[0].Alerts))
	}
	if result[0].Alerts[0].Fingerprint != "abc123" {
		t.Errorf("fingerprint = %q, want %q", result[0].Alerts[0].Fingerprint, "abc123")
	}
}

func TestSilencesInvalidJSON(t *testing.T) {
	// verifies that invalid JSON in the silences response returns a decode error
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	_, err := silences(srv.Client(), u, 5*time.Second)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestSilencesValid(t *testing.T) {
	// verifies that a valid silences JSON response is decoded correctly,
	// including matcher with explicit isEqual=false
	payload := `[{
		"id": "silence-1",
		"startsAt": "2025-03-10T12:00:00.000Z",
		"endsAt": "2025-03-11T12:00:00.000Z",
		"createdBy": "user@example.com",
		"comment": "test silence",
		"matchers": [
			{"name": "alertname", "value": "TestAlert", "isRegex": false},
			{"name": "env", "value": "prod", "isRegex": true, "isEqual": false}
		]
	}]`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(payload))
	}))
	defer srv.Close()

	u, _ := url.Parse(srv.URL)
	result, err := silences(srv.Client(), u, 5*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("got %d silences, want 1", len(result))
	}
	if result[0].ID != "silence-1" {
		t.Errorf("ID = %q, want %q", result[0].ID, "silence-1")
	}
	if result[0].CreatedBy != "user@example.com" {
		t.Errorf("CreatedBy = %q, want %q", result[0].CreatedBy, "user@example.com")
	}
	if len(result[0].Matchers) != 2 {
		t.Fatalf("got %d matchers, want 2", len(result[0].Matchers))
	}
}

func TestGroupsApiGetError(t *testing.T) {
	// verifies that when the API server is unreachable, groups returns an error
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {}))
	u, _ := url.Parse(srv.URL)
	srv.Close()

	result, err := groups(srv.Client(), u, 5*time.Second)
	if err == nil {
		t.Fatal("expected error for closed server, got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result, got %d groups", len(result))
	}
}

func TestSilencesApiGetError(t *testing.T) {
	// verifies that when the API server is unreachable, silences returns an error
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {}))
	u, _ := url.Parse(srv.URL)
	srv.Close()

	result, err := silences(srv.Client(), u, 5*time.Second)
	if err == nil {
		t.Fatal("expected error for closed server, got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result, got %d silences", len(result))
	}
}
