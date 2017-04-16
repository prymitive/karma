package transport

import (
	"encoding/json"
	"fmt"
	"net/url"
	"time"
)

func readFile(filename string, target interface{}) error {
	reader, err := newFileReader(filename)
	if err != nil {
		return err
	}
	return json.NewDecoder(reader).Decode(target)
}

func readHTTP(url string, timeout time.Duration, target interface{}) error {
	reader, err := newHTTPReader(url, timeout)
	if err != nil {
		return err
	}
	return json.NewDecoder(*reader).Decode(target)
}

// ReadJSON using one of supported transports (file:// http://)
func ReadJSON(uri string, timeout time.Duration, target interface{}) error {
	u, err := url.Parse(uri)
	if err != nil {
		return err
	}
	if u.Scheme == "file" {
		return readFile(u.Path, target)
	}
	if u.Scheme == "http" || u.Scheme == "https" {
		return readHTTP(u.String(), timeout, target)
	}
	return fmt.Errorf("Unsupported URI scheme '%s' in '%s'", u.Scheme, u)
}
