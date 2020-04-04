package filters

import (
	"testing"

	"github.com/prymitive/karma/internal/models"
)

func TestMatchOnInvalidFilter(t *testing.T) {
	for _, ft := range AllFilters {
		f := ft.Factory()
		m, _ := newMatcher(f.GetMatcher())
		f.init(f.GetName(), &m, f.GetRawText(), false, f.GetValue())
		func() {
			didPanic := false
			defer func() {
				if r := recover(); r != nil {
					didPanic = true
				}
			}()
			alert := models.Alert{}
			f.Match(&alert, 0)
			if !didPanic {
				t.Errorf("[%s] Match() on invalid filter didn't cause panic", ft.Label)
			}
		}()
	}
}

func TestGetMatcherNil(t *testing.T) {
	f := alertFilter{}
	m := f.GetMatcher()
	if m != "" {
		t.Errorf("Got %q from empty filter GetMatcher()", m)
	}
}

func TestGetMatcherNotNil(t *testing.T) {
	matcher, _ := newMatcher("=")
	f := alertFilter{
		Matcher: matcher,
	}
	m := f.GetMatcher()
	if m != "=" {
		t.Errorf("Got %q from empty filter GetMatcher()", m)
	}
}
