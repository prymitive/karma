package v017

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/mapper"
)

type Silence struct {
	ID     string `json:"id,omitempty"`
	Status struct {
		State string `json:"state"`
	} `json:"status"`
	Matchers []struct {
		IsEqual *bool  `json:"isEqual,omitempty"`
		IsRegex bool   `json:"isRegex"`
		Name    string `json:"name"`
		Value   string `json:"value"`
	} `json:"matchers"`
	CreatedBy string    `json:"createdBy"`
	Comment   string    `json:"comment"`
	StartsAt  time.Time `json:"startsAt"`
	EndsAt    time.Time `json:"endsAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type SilenceResponse struct {
	SilenceID string `json:"silenceID"`
}

func newHTTPClient(uri string, headers map[string]string, httpTransport http.RoundTripper) *http.Client {
	u, _ := url.Parse(uri)

	c := http.DefaultClient

	if httpTransport != nil {
		c.Transport = mapper.SetHeaders(httpTransport, headers)
	} else {
		c.Transport = mapper.SetHeaders(http.DefaultTransport, headers)
	}

	if u.User.Username() != "" {
		username := u.User.Username()
		password, _ := u.User.Password()
		c.Transport = mapper.SetAuth(c.Transport, username, password)
	}

	return c
}

func streamSilences(client *http.Client, api string, timeout time.Duration) (silences []Silence, err error) {
	var uri string
	if strings.HasSuffix(api, "/") {
		uri = api + "api/v2/silences"
	} else {
		uri = api + "/api/v2/silences"
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uri, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid response status code: %s", resp.Status)
	}

	dec := json.NewDecoder(resp.Body)

	tok, err := dec.Token()
	if err != nil {
		return nil, err
	}
	if tok != json.Delim('[') {
		return nil, fmt.Errorf("invalid JSON token, expected [, got %s", tok)
	}

	var silence Silence
	for dec.More() {
		silence.Matchers = nil
		if err = dec.Decode(&silence); err != nil {
			return nil, err
		}
		silences = append(silences, silence)
	}

	tok, err = dec.Token()
	if err != nil {
		return nil, err
	}
	if tok != json.Delim(']') {
		return nil, fmt.Errorf("invalid JSON token, expected ], got %s", tok)
	}

	_, _ = io.Copy(io.Discard, resp.Body)

	return silences, nil
}
