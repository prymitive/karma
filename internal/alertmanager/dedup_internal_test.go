package alertmanager

import (
	"testing"

	"github.com/prymitive/karma/internal/models"
)

func TestMergeAutocompleteHintNewEntry(t *testing.T) {
	// verifies that a new hint is appended to the result slice
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Value != "foo=bar" {
		t.Errorf("expected Value %q, got %q", "foo=bar", result[0].Value)
	}
	if len(result[0].Tokens) != 2 {
		t.Errorf("expected 2 tokens, got %d", len(result[0].Tokens))
	}
	if idx, ok := index["foo=bar"]; !ok || idx != 0 {
		t.Errorf("expected index[\"foo=bar\"] == 0, got %d (ok=%v)", idx, ok)
	}
}

func TestMergeAutocompleteHintDuplicateTokens(t *testing.T) {
	// verifies that duplicate tokens from a second upstream are not appended
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})
	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result after merge, got %d", len(result))
	}
	if len(result[0].Tokens) != 2 {
		t.Errorf("expected 2 tokens after merge with identical tokens, got %d", len(result[0].Tokens))
	}
}

func TestMergeAutocompleteHintNewTokens(t *testing.T) {
	// verifies that new tokens from a second upstream are appended
	var result []models.Autocomplete
	index := map[string]int{}

	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"foo", "foo=bar"},
	})
	mergeAutocompleteHint(&result, index, models.Autocomplete{
		Value:  "foo=bar",
		Tokens: []string{"extra_token"},
	})

	if len(result) != 1 {
		t.Fatalf("expected 1 result after merge, got %d", len(result))
	}
	expected := []string{"foo", "foo=bar", "extra_token"}
	if len(result[0].Tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(result[0].Tokens), result[0].Tokens)
	}
	for i, tok := range expected {
		if result[0].Tokens[i] != tok {
			t.Errorf("token[%d] = %q, want %q", i, result[0].Tokens[i], tok)
		}
	}
}
