package log

import (
	"log/slog"
	"testing"
)

func TestParseLevel(t *testing.T) {
	testCases := []struct {
		input    string
		expected slog.Level
		hasError bool
	}{
		{input: "debug", expected: slog.LevelDebug, hasError: false},
		{input: "info", expected: slog.LevelInfo, hasError: false},
		{input: "warning", expected: slog.LevelWarn, hasError: false},
		{input: "error", expected: slog.LevelError, hasError: false},
		{input: "unknown", expected: slog.LevelInfo, hasError: true},
		{input: "", expected: slog.LevelInfo, hasError: true},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			level, err := ParseLevel(tc.input)
			if tc.hasError && err == nil {
				t.Errorf("ParseLevel(%q) expected error, got nil", tc.input)
			}
			if !tc.hasError && err != nil {
				t.Errorf("ParseLevel(%q) unexpected error: %v", tc.input, err)
			}
			if level != tc.expected {
				t.Errorf("ParseLevel(%q) = %v, want %v", tc.input, level, tc.expected)
			}
		})
	}
}

func TestSetLevel(t *testing.T) {
	testCases := []slog.Level{
		slog.LevelDebug,
		slog.LevelInfo,
		slog.LevelWarn,
		slog.LevelError,
	}

	for _, level := range testCases {
		t.Run(level.String(), func(t *testing.T) {
			SetLevel(level)
			if Level.Level() != level {
				t.Errorf("SetLevel(%v) resulted in Level=%v", level, Level.Level())
			}
		})
	}
}

func TestSetupLogger(t *testing.T) {
	testCases := []struct {
		format     string
		timestamps bool
		hasError   bool
	}{
		{format: "text", timestamps: false, hasError: false},
		{format: "text", timestamps: true, hasError: false},
		{format: "json", timestamps: false, hasError: false},
		{format: "json", timestamps: true, hasError: false},
		{format: "invalid", timestamps: false, hasError: true},
	}

	for _, tc := range testCases {
		t.Run(tc.format, func(t *testing.T) {
			err := SetupLogger(tc.format, tc.timestamps)
			if tc.hasError && err == nil {
				t.Errorf("SetupLogger(%q, %v) expected error, got nil", tc.format, tc.timestamps)
			}
			if !tc.hasError && err != nil {
				t.Errorf("SetupLogger(%q, %v) unexpected error: %v", tc.format, tc.timestamps, err)
			}
		})
	}
}
