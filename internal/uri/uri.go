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
	Read(string) (io.ReadCloser, error)
}

// NewReader creates an instance of URIReader that can handle URI schema
// for the passed uri string
func NewReader(uri string, timeout time.Duration, clientTransport http.RoundTripper) (Reader, error) {
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
	case "file":
		return &FileURIReader{}, nil
	default:
		return nil, fmt.Errorf("Unsupported URI scheme '%s' in '%s'", u.Scheme, u)
	}
}
