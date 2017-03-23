package alertmanager

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"time"

	log "github.com/Sirupsen/logrus"
)

// joinURL can be used to join a base url (http(s)://domain.com) and a path (/my/path)
// it will return a joined string or an error (if you supply invalid url)
func joinURL(base string, sub string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	u.Path = path.Join(u.Path, sub)
	return u.String(), nil
}

// getJSONFromURL is a helper function that takesan URL, request timeout
// and target structure, it will make a HTTP request and decode JSON response
// onto the structure provided
func getJSONFromURL(url string, timeout time.Duration, target interface{}) error {
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
		return fmt.Errorf("Request to AlertManager failed with %s", resp.Status)
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
