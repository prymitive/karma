package transport

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"time"
)

// ReadJSON using one of supported transports (file:// http://)
func ReadJSON(uri string, timeout time.Duration, target interface{}) error {
	u, err := url.Parse(uri)
	if err != nil {
		return err
	}
	var reader io.ReadCloser
	switch u.Scheme {
	case "http", "https":
		reader, err = newHTTPReader(u.String(), timeout)
	case "file":
		reader, err = newFileReader(u.Path)
	default:
		return fmt.Errorf("Unsupported URI scheme '%s' in '%s'", u.Scheme, u)
	}
	if err != nil {
		return err
	}
	defer reader.Close()
	return json.NewDecoder(reader).Decode(target)
}
