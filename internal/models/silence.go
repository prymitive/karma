package models

import (
	"regexp"
	"time"

	"github.com/go-json-experiment/json/jsontext"

	"github.com/prymitive/karma/internal/regex"
)

type SilenceMatcher struct {
	re      *regexp.Regexp
	Name    string `json:"name"`
	Value   string `json:"value"`
	IsRegex bool   `json:"isRegex"`
	IsEqual bool   `json:"isEqual"`
}

func NewSilenceMatcher(name, value string, isRegexp, isEqual bool) SilenceMatcher {
	sm := SilenceMatcher{
		Name:    name,
		Value:   value,
		IsRegex: isRegexp,
		IsEqual: isEqual,
	}
	if sm.IsRegex {
		sm.re = regex.MustCompileAnchored(sm.Value)
	}
	return sm
}

func (sm SilenceMatcher) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	sm.marshalTo(&w)
	return w.err
}

func (sm *SilenceMatcher) marshalTo(w *jsonWriter) {
	w.beginObject()
	w.key("name")
	w.str(sm.Name)
	w.key("value")
	w.str(sm.Value)
	w.key("isRegex")
	w.boolean(sm.IsRegex)
	w.key("isEqual")
	w.boolean(sm.IsEqual)
	w.endObject()
}

func (sm SilenceMatcher) IsMatch(labels map[string]string) bool {
	v, ok := labels[sm.Name]
	if !ok {
		return !sm.IsEqual
	}

	if sm.IsRegex {
		return sm.IsEqual == sm.re.MatchString(v)
	}
	return sm.IsEqual == (sm.Value == v)
}

// Silence is vanilla silence + some additional attributes
// karma adds JIRA support, it can extract JIRA IDs from comments
// extracted ID is used to generate link to JIRA issue
// this means karma needs to store additional fields for each silence
type Silence struct {
	StartsAt  time.Time        `json:"startsAt"`
	EndsAt    time.Time        `json:"endsAt"`
	CreatedAt time.Time        `json:"createdAt"`
	ID        string           `json:"id"`
	CreatedBy string           `json:"createdBy"`
	Comment   string           `json:"comment"`
	TicketID  string           `json:"ticketID"`
	TicketURL string           `json:"ticketURL"`
	Matchers  []SilenceMatcher `json:"matchers"`
}

func (s Silence) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	s.marshalTo(&w)
	return w.err
}

func (s *Silence) marshalTo(w *jsonWriter) {
	w.beginObject()
	w.key("startsAt")
	w.time(s.StartsAt)
	w.key("endsAt")
	w.time(s.EndsAt)
	w.key("createdAt")
	w.time(s.CreatedAt)
	w.key("id")
	w.str(s.ID)
	w.key("createdBy")
	w.str(s.CreatedBy)
	w.key("comment")
	w.str(s.Comment)
	w.key("ticketID")
	w.str(s.TicketID)
	w.key("ticketURL")
	w.str(s.TicketURL)
	w.key("matchers")
	w.beginArray()
	for i := range s.Matchers {
		s.Matchers[i].marshalTo(w)
	}
	w.endArray()
	w.endObject()
}

func (s Silence) IsMatch(labels map[string]string) bool {
	for _, m := range s.Matchers {
		if !m.IsMatch(labels) {
			return false
		}
	}
	return true
}

// ManagedSilence is a standalone silence detached from any alert
type ManagedSilence struct {
	Cluster    string  `json:"cluster"`
	Silence    Silence `json:"silence"`
	AlertCount int     `json:"alertCount"`
	IsExpired  bool    `json:"isExpired"`
}

func (ms ManagedSilence) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := jsonWriter{enc: enc}
	w.beginObject()
	w.key("cluster")
	w.str(ms.Cluster)
	w.key("silence")
	ms.Silence.marshalTo(&w)
	w.key("alertCount")
	w.integer(ms.AlertCount)
	w.key("isExpired")
	w.boolean(ms.IsExpired)
	w.endObject()
	return w.err
}
