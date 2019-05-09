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

func SetAuth(inner http.RoundTripper, username string, password string) http.RoundTripper {
	return &authRoundTripper{
		inner:    inner,
		Username: username,
		Password: password,
	}
}

type authRoundTripper struct {
	inner    http.RoundTripper
	Username string
	Password string
}

func (art *authRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) {
	r.SetBasicAuth(art.Username, art.Password)
	return art.inner.RoundTrip(r)
}
