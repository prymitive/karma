package uri

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"

	"github.com/rs/zerolog/log"
)

// HTTPURIReader can read data from http:// and https:// URIs
type HTTPURIReader struct {
	client http.Client
}

func (r *HTTPURIReader) Read(uri string, headers map[string]string) (io.ReadCloser, error) {
	suri := SanitizeURI(uri)
	log.Info().
		Str("uri", suri).
		Dur("timeout", r.client.Timeout).
		Msg("GET request")

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
			return nil, fmt.Errorf("failed to decode gzipped content: %s", err.Error())
		}
	default:
		reader = resp.Body
	}
	return reader, nil
}
