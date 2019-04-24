package mapper

import "net/http"

func SetHeaders(inner http.RoundTripper, headers map[string]string) http.RoundTripper {
	return &headersRoundTripper{
		inner:   inner,
		Headers: headers,
	}
}

type headersRoundTripper struct {
	inner   http.RoundTripper
	Headers map[string]string
}

func (hrt *headersRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) {
	for k, v := range hrt.Headers {
		r.Header.Set(k, v)
	}
	return hrt.inner.RoundTrip(r)
}
