package filters

import (
	"testing"

	"github.com/prymitive/karma/internal/models"
)

// verifies that an invalid filter (Valid()==false) returns false from Match
// instead of panicking
func TestMatchOnInvalidFilterReturnsFalse(t *testing.T) {
	f := &filterBase{rawText: "invalid", isValid: false}
	alert := models.Alert{}
	if f.Match(&alert, 0) {
		t.Error("Match() on invalid filterBase returned true, expected false")
	}
}

// verifies that MatcherOperation returns empty string when no matcher is set
func TestMatcherOperationEmpty(t *testing.T) {
	f := &filterBase{}
	if op := f.MatcherOperation(); op != "" {
		t.Errorf("MatcherOperation() = %q, want empty string", op)
	}
}

// verifies that MatcherOperation returns the operator when a matcher is set
func TestMatcherOperationSet(t *testing.T) {
	m, err := newMatcher("=")
	if err != nil {
		t.Fatalf("newMatcher(\"=\") returned error: %v", err)
	}
	f := &filterBase{matcher: m}
	if op := f.MatcherOperation(); op != "=" {
		t.Errorf("MatcherOperation() = %q, want \"=\"", op)
	}
}
