package v017

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"sort"
	"time"

	json "github.com/go-json-experiment/json"
	"github.com/go-json-experiment/json/jsontext"
	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
)

// dateTime is a time.Time that marshals to RFC3339 with millisecond precision,
// matching the format used by Alertmanager's API.
type dateTime time.Time

func (dt dateTime) MarshalJSONTo(enc *jsontext.Encoder) error {
	return enc.WriteToken(jsontext.String(time.Time(dt).Format("2006-01-02T15:04:05.000Z07:00")))
}

func (dt *dateTime) UnmarshalJSONFrom(dec *jsontext.Decoder) error {
	val, err := dec.ReadValue()
	if err != nil {
		return err
	}
	s, err := jsontext.AppendUnquote(nil, val)
	if err != nil {
		return err
	}
	t, err := time.Parse(time.RFC3339Nano, string(s))
	if err != nil {
		return err
	}
	*dt = dateTime(t)
	return nil
}

type receiver struct {
	Name string `json:"name"`
}

type alertStatus struct {
	State       string   `json:"state"`
	InhibitedBy []string `json:"inhibitedBy"`
	SilencedBy  []string `json:"silencedBy"`
}

type jsonLabels struct {
	ls labels.Labels
}

func (jl *jsonLabels) UnmarshalJSONFrom(dec *jsontext.Decoder) error {
	if _, err := dec.ReadToken(); err != nil {
		return err
	}

	var ls []labels.Label
	for dec.PeekKind() != '}' {
		keyTok, err := dec.ReadToken()
		if err != nil {
			return err
		}
		name := keyTok.String()
		valTok, err := dec.ReadToken()
		if err != nil {
			return err
		}
		ls = append(ls, labels.Label{
			Name:  name,
			Value: valTok.String(),
		})
	}

	if _, err := dec.ReadToken(); err != nil {
		return err
	}

	jl.ls = labels.New(ls...)
	return nil
}

type jsonAnnotations struct {
	annos models.Annotations
}

func (ja *jsonAnnotations) UnmarshalJSONFrom(dec *jsontext.Decoder) error {
	if _, err := dec.ReadToken(); err != nil {
		return err
	}

	var annotations models.Annotations
	for dec.PeekKind() != '}' {
		keyTok, err := dec.ReadToken()
		if err != nil {
			return err
		}
		name := keyTok.String()
		valTok, err := dec.ReadToken()
		if err != nil {
			return err
		}
		annotations = append(annotations, models.NewAnnotation(name, valTok.String()))
	}

	if _, err := dec.ReadToken(); err != nil {
		return err
	}

	models.SortAnnotations(annotations)
	ja.annos = annotations
	return nil
}

type alert struct {
	StartsAt     time.Time       `json:"startsAt"`
	Annotations  jsonAnnotations `json:"annotations"`
	Labels       jsonLabels      `json:"labels"`
	Fingerprint  string          `json:"fingerprint"`
	GeneratorURL string          `json:"generatorURL"`
	Status       alertStatus     `json:"status"`
}

type alertGroup struct {
	Labels   jsonLabels `json:"labels"`
	Receiver receiver   `json:"receiver"`
	Alerts   []alert    `json:"alerts"`
}

type matcher struct {
	IsEqual *bool  `json:"isEqual,omitempty"`
	Name    string `json:"name"`
	Value   string `json:"value"`
	IsRegex bool   `json:"isRegex"`
}

type silence struct {
	EndsAt    dateTime  `json:"endsAt"`
	StartsAt  dateTime  `json:"startsAt"`
	ID        string    `json:"id,omitempty"`
	Comment   string    `json:"comment"`
	CreatedBy string    `json:"createdBy"`
	Matchers  []matcher `json:"matchers"`
}

func newHTTPClient(uri string, headers map[string]string, httpTransport http.RoundTripper) (*http.Client, *url.URL) {
	u, _ := url.Parse(uri)

	transport := http.DefaultTransport
	if httpTransport != nil {
		transport = httpTransport
	}
	transport = mapper.SetHeaders(transport, headers)

	if u.User.Username() != "" {
		username := u.User.Username()
		password, _ := u.User.Password()
		transport = mapper.SetAuth(transport, username, password)
	}

	return &http.Client{Transport: transport}, u
}

func apiGet(ctx context.Context, client *http.Client, baseURL *url.URL, apiPath string) (io.ReadCloser, error) {
	u := *baseURL
	u.Path = path.Join(u.Path, "api/v2", apiPath)
	u.User = nil

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request for %s: %w", u.String(), err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("request to %s returned status %d", u.String(), resp.StatusCode)
	}

	return resp.Body, nil
}

func groups(client *http.Client, baseURL *url.URL, timeout time.Duration) ([]models.AlertGroup, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	body, err := apiGet(ctx, client, baseURL, "alerts/groups")
	if err != nil {
		return []models.AlertGroup{}, err
	}
	defer body.Close()

	var alertGroups []alertGroup
	if err := json.UnmarshalRead(body, &alertGroups); err != nil {
		return []models.AlertGroup{}, fmt.Errorf("failed to decode alert groups: %w", err)
	}

	ret := make([]models.AlertGroup, 0, len(alertGroups))

	for _, group := range alertGroups {
		g := models.AlertGroup{
			Receiver: group.Receiver.Name,
			Labels:   group.Labels.ls,
			Alerts:   make(models.AlertList, 0, len(group.Alerts)),
		}
		for _, alert := range group.Alerts {
			a := models.Alert{
				Fingerprint:  alert.Fingerprint,
				Receiver:     group.Receiver.Name,
				Annotations:  alert.Annotations.annos,
				Labels:       alert.Labels.ls,
				StartsAt:     alert.StartsAt,
				GeneratorURL: alert.GeneratorURL,
				State:        models.ParseAlertState(alert.Status.State),
				InhibitedBy:  alert.Status.InhibitedBy,
				SilencedBy:   alert.Status.SilencedBy,
			}
			sort.Strings(a.InhibitedBy)
			sort.Strings(a.SilencedBy)
			a.UpdateFingerprints()
			g.Alerts = append(g.Alerts, a)
		}
		ret = append(ret, g)
	}

	return ret, nil
}

func silences(client *http.Client, baseURL *url.URL, timeout time.Duration) ([]models.Silence, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	body, err := apiGet(ctx, client, baseURL, "silences")
	if err != nil {
		return []models.Silence{}, err
	}
	defer body.Close()

	var silences []silence
	if err := json.UnmarshalRead(body, &silences); err != nil {
		return []models.Silence{}, fmt.Errorf("failed to decode silences: %w", err)
	}

	ret := make([]models.Silence, 0, len(silences))

	for _, s := range silences {
		us := models.Silence{
			ID:        s.ID,
			StartsAt:  time.Time(s.StartsAt),
			EndsAt:    time.Time(s.EndsAt),
			CreatedBy: s.CreatedBy,
			Comment:   s.Comment,
		}
		for _, m := range s.Matchers {
			isEqual := true
			if m.IsEqual != nil {
				isEqual = *m.IsEqual
			}
			us.Matchers = append(us.Matchers, models.NewSilenceMatcher(m.Name, m.Value, m.IsRegex, isEqual))
		}
		ret = append(ret, us)
	}

	return ret, nil
}

func rewriteSilenceUsername(body []byte, username string) ([]byte, error) {
	var s silence
	if err := json.Unmarshal(body, &s); err != nil {
		return nil, err
	}
	s.CreatedBy = username
	return json.Marshal(s)
}

func unmarshal(body []byte) (*models.Silence, error) {
	var s silence
	if err := json.Unmarshal(body, &s); err != nil {
		return nil, err
	}

	us := models.Silence{
		ID:        s.ID,
		StartsAt:  time.Time(s.StartsAt),
		EndsAt:    time.Time(s.EndsAt),
		CreatedBy: s.CreatedBy,
		Comment:   s.Comment,
	}

	for _, m := range s.Matchers {
		isEqual := true
		if m.IsEqual != nil {
			isEqual = *m.IsEqual
		}
		us.Matchers = append(us.Matchers, models.NewSilenceMatcher(m.Name, m.Value, m.IsRegex, isEqual))
	}

	return &us, nil
}
