package alertmanager_test

import (
	"os"
	"testing"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
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
	os.Setenv("COLOR_LABELS_UNIQUE", "cluster instance @receiver")
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	config.Config.Read()
	if err := pullAlerts(); err != nil {
		b.Error(err)
	}
	for n := 0; n < b.N; n++ {
		alertmanager.DedupColors()
	}
}
