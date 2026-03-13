package uri

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/klauspost/compress/gzip"
)

// HTTPURIReader can read data from http:// and https:// URIs
type HTTPURIReader struct {
	client http.Client
}

func (r *HTTPURIReader) Read(uri string, headers map[string]string) (io.ReadCloser, error) {
	suri := SanitizeURI(uri)
	slog.Info("GET request", slog.String("uri", suri), slog.Duration("timeout", r.client.Timeout))

	request, err := http.NewRequest("GET", uri, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("Accept-Encoding", "gzip")

	for header, value := range headers {
		request.Header.Add(header, value)
	}

	resp, err := r.client.Do(request)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request to %s failed with %s", suri, resp.Status)
	}

	var reader io.ReadCloser
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to decode gzipped content: %w", err)
		}
	default:
		reader = resp.Body
	}
	return reader, nil
}
