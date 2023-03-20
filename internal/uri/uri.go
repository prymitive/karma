package uri

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Reader reads from a specific URI schema
type Reader interface {
	Read(string, map[string]string) (io.ReadCloser, error)
}

// NewReader creates an instance of URIReader that can handle URI schema
// for the passed uri string
func NewReader(uri string, timeout time.Duration, clientTransport http.RoundTripper, _ map[string]string) (Reader, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return nil, err
	}

	switch u.Scheme {
	case "http", "https":
		client := http.Client{
			Timeout:   timeout,
			Transport: clientTransport,
		}
		return &HTTPURIReader{client: client}, nil
	default:
		return nil, fmt.Errorf("unsupported URI scheme '%s' in '%s'", u.Scheme, SanitizeURI(u.String()))
	}
}
