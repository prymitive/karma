package v017

import (
	"net/http"
	"net/url"
	"path"
	"sort"
	"time"

	httptransport "github.com/go-openapi/runtime/client"

	"github.com/prymitive/karma/internal/intern"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/mapper/v017/client"
	"github.com/prymitive/karma/internal/mapper/v017/client/alertgroup"
	"github.com/prymitive/karma/internal/mapper/v017/client/silence"
	ammodels "github.com/prymitive/karma/internal/mapper/v017/models"
	"github.com/prymitive/karma/internal/models"
)

func newClient(uri string, headers map[string]string, httpTransport http.RoundTripper) *client.AlertmanagerAPI {
	u, _ := url.Parse(uri)

	transport := httptransport.New(u.Host, path.Join(u.Path, "/api/v2"), []string{u.Scheme})

	if httpTransport != nil {
		transport.Transport = mapper.SetHeaders(httpTransport, headers)
	} else {
		transport.Transport = mapper.SetHeaders(transport.Transport, headers)
	}

	if u.User.Username() != "" {
		username := u.User.Username()
		password, _ := u.User.Password()
		transport.Transport = mapper.SetAuth(transport.Transport, username, password)
	}

	c := client.New(transport, nil)
	return c
}

// Alerts will fetch all alert groups from the API
func groups(c *client.AlertmanagerAPI, timeout time.Duration, si *intern.Interner) ([]models.AlertGroup, error) {
	groups, err := c.Alertgroup.GetAlertGroups(alertgroup.NewGetAlertGroupsParamsWithTimeout(timeout))
	if err != nil {
		return []models.AlertGroup{}, err
	}

	ret := make([]models.AlertGroup, 0, len(groups.Payload))

	for _, group := range groups.Payload {
		ls := make(models.Labels, 0, len(group.Labels))
		for k, v := range group.Labels {
			ls = ls.Set(si.String(k), si.String(v))
		}
		sort.Sort(ls)
		g := models.AlertGroup{
			Receiver: si.String(*group.Receiver.Name),
			Labels:   ls,
			Alerts:   make(models.AlertList, 0, len(group.Alerts)),
		}
		for _, alert := range group.Alerts {
			ls := make(models.Labels, 0, len(alert.Labels))
			for k, v := range alert.Labels {
				ls = ls.Set(si.String(k), si.String(v))
			}
			sort.Sort(ls)
			a := models.Alert{
				Fingerprint:  *alert.Fingerprint,
				Receiver:     si.String(*group.Receiver.Name),
				Annotations:  models.AnnotationsFromMap(alert.Annotations),
				Labels:       ls,
				StartsAt:     time.Time(*alert.StartsAt),
				GeneratorURL: si.String(alert.GeneratorURL.String()),
				State:        si.String(*alert.Status.State),
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

func silences(c *client.AlertmanagerAPI, timeout time.Duration, si *intern.Interner) ([]models.Silence, error) {
	silences, err := c.Silence.GetSilences(silence.NewGetSilencesParamsWithTimeout(timeout))
	if err != nil {
		return []models.Silence{}, err
	}

	ret := make([]models.Silence, 0, len(silences.Payload))

	for _, s := range silences.Payload {
		us := models.Silence{
			ID:        *s.ID,
			StartsAt:  time.Time(*s.StartsAt),
			EndsAt:    time.Time(*s.EndsAt),
			CreatedBy: si.String(*s.CreatedBy),
			Comment:   si.String(*s.Comment),
		}
		for _, m := range s.Matchers {
			sm := models.SilenceMatcher{
				Name:    si.String(*m.Name),
				Value:   si.String(*m.Value),
				IsRegex: *m.IsRegex,
				IsEqual: *m.IsEqual,
			}
			us.Matchers = append(us.Matchers, sm)
		}
		ret = append(ret, us)
	}

	return ret, nil
}

func rewriteSilenceUsername(body []byte, username string) ([]byte, error) {
	s := ammodels.PostableSilence{}
	err := s.UnmarshalBinary(body)
	if err != nil {
		return nil, err
	}
	s.CreatedBy = &username
	return s.MarshalBinary()
}

func unmarshal(body []byte) (*models.Silence, error) {
	s := ammodels.PostableSilence{}

	err := s.UnmarshalBinary(body)
	if err != nil {
		return nil, err
	}

	us := models.Silence{
		ID:        s.ID,
		StartsAt:  time.Time(*s.StartsAt),
		EndsAt:    time.Time(*s.EndsAt),
		CreatedBy: *s.CreatedBy,
		Comment:   *s.Comment,
	}

	var isEqual bool
	for _, m := range s.Matchers {
		if m.IsEqual != nil {
			isEqual = *m.IsEqual
		} else {
			isEqual = true
		}
		sm := models.SilenceMatcher{
			Name:    *m.Name,
			Value:   *m.Value,
			IsRegex: *m.IsRegex,
			IsEqual: isEqual,
		}
		us.Matchers = append(us.Matchers, sm)
	}

	return &us, nil
}
