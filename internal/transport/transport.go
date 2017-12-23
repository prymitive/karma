package transport

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Transport reads from a specific URI schema
type Transport interface {
	Read(string) (io.ReadCloser, error)
}

// NewTransport creates an instance of Transport that can handle URI schema
// for the passed uri string
func NewTransport(uri string, timeout time.Duration, clientTransport http.RoundTripper) (Transport, error) {
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
		return &HTTPTransport{client: client}, nil
	case "file":
		return &FileTransport{}, nil
	default:
		return nil, fmt.Errorf("Unsupported URI scheme '%s' in '%s'", u.Scheme, u)
	}
}
