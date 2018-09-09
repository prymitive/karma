package alertmanager_test

import (
	"os"
	"testing"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
)

func BenchmarkDedupAlerts(b *testing.B) {
	if err := pullAlerts(); err != nil {
		b.Error(err)
	}
	for n := 0; n < b.N; n++ {
		alertmanager.DedupAlerts()
	}
}

func BenchmarkDedupAutocomplete(b *testing.B) {
	if err := pullAlerts(); err != nil {
		b.Error(err)
	}
	for n := 0; n < b.N; n++ {
		alertmanager.DedupAutocomplete()
	}
}

func BenchmarkDedupColors(b *testing.B) {
	os.Setenv("LABELS_COLOR_UNIQUE", "cluster instance @receiver")
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	config.Config.Read()
	if err := pullAlerts(); err != nil {
		b.Error(err)
	}
	for n := 0; n < b.N; n++ {
		alertmanager.DedupColors()
	}
}
