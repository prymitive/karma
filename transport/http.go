package transport

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	log "github.com/Sirupsen/logrus"
)

// GetJSONFromURL allows to fetch Alertmanager data over HTTP transport and
// decode it onto provided data structure.
func GetJSONFromURL(url string, timeout time.Duration, target interface{}) error {
	log.Infof("GET %s", url)

	c := &http.Client{
		Timeout: timeout,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Add("Accept-Encoding", "gzip")
	resp, err := c.Do(req)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Request to Alertmanager failed with %s", resp.Status)
	}

	defer resp.Body.Close()

	var reader io.ReadCloser
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(resp.Body)
		if err != nil {
			return fmt.Errorf("Failed to decode gzipped content: %s", err.Error())
		}
		defer reader.Close()
	default:
		reader = resp.Body
	}

	return json.NewDecoder(reader).Decode(target)
}

type httpReader struct {
	URL     string
	Timeout time.Duration
}

func newHTTPReader(url string, timeout time.Duration) (*io.ReadCloser, error) {
	hr := httpReader{URL: url, Timeout: timeout}

	log.Infof("GET %s timeout=%s", hr.URL, hr.Timeout)

	c := &http.Client{
		Timeout: timeout,
	}

	req, err := http.NewRequest("GET", hr.URL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Accept-Encoding", "gzip")
	resp, err := c.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Request to Alertmanager failed with %s", resp.Status)
	}

	defer resp.Body.Close()

	var reader io.ReadCloser
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("Failed to decode gzipped content: %s", err.Error())
		}
		defer reader.Close()
	default:
		reader = resp.Body
	}
	return &reader, nil
}
