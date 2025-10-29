package alertmanager_test

import (
	"testing"

	"github.com/jarcoal/httpmock"
	"github.com/spf13/pflag"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
)

func BenchmarkDedupAlerts(b *testing.B) {
	version := mock.ListAllMocks()[0]
	mock.RegisterURL("http://localhost/metrics", version, "metrics.txt")
	mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status.json")
	mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups.json")
	mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences.json")

	httpmock.Activate()
	defer httpmock.Deactivate()

	b.Setenv("ALERTMANAGER_URI", "http://localhost")

	if err := pullAlerts(); err != nil {
		b.Error(err)
	}

	b.Run("Run", func(b *testing.B) {
		for n := 0; n < b.N; n++ {
			alertmanager.DedupAlerts()
		}
	})
}

func BenchmarkDedupAutocomplete(b *testing.B) {
	version := mock.ListAllMocks()[0]
	mock.RegisterURL("http://localhost/metrics", version, "metrics.txt")
	mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status.json")
	mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups.json")
	mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences.json")

	httpmock.Activate()
	defer httpmock.Deactivate()

	b.Setenv("ALERTMANAGER_URI", "http://localhost")

	if err := pullAlerts(); err != nil {
		b.Error(err)
	}

	b.Run("Run", func(b *testing.B) {
		for n := 0; n < b.N; n++ {
			alertmanager.DedupAutocomplete()
		}
	})
}

func BenchmarkDedupColors(b *testing.B) {
	b.Setenv("LABELS_COLOR_UNIQUE", "cluster instance @receiver")
	f := pflag.NewFlagSet(".", pflag.ExitOnError)
	config.SetupFlags(f)
	_, _ = config.Config.Read(f)

	version := mock.ListAllMocks()[0]
	mock.RegisterURL("http://localhost/metrics", version, "metrics.txt")
	mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status.json")
	mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups.json")
	mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences.json")

	httpmock.Activate()
	defer httpmock.Deactivate()

	b.Setenv("ALERTMANAGER_URI", "http://localhost")

	if err := pullAlerts(); err != nil {
		b.Error(err)
	}

	b.Run("Run", func(b *testing.B) {
		for n := 0; n < b.N; n++ {
			alertmanager.DedupColors()
		}
	})
}
