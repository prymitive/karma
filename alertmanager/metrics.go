package alertmanager

import "github.com/prometheus/client_golang/prometheus"

var (
	metricAlerts = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_collected_alerts",
			Help: "Total number of alerts collected from Alertmanager API",
		},
		[]string{"alertmanager", "state"},
	)
	metricAlertGroups = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_collected_groups",
			Help: "Total number of alert groups collected from Alertmanager API",
		},
		[]string{"alertmanager"},
	)
	metricAlertmanagerErrors = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_alertmanager_errors_total",
			Help: "Total number of errors encounter when requesting data from Alertmanager API",
		},
		[]string{"alertmanager", "endpoint"},
	)
	metricCollectRuns = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "unsee_collect_cycles_total",
			Help: "Total number of alert collection cycles run",
		},
		[]string{"alertmanager"},
	)
)

func init() {
	prometheus.MustRegister(metricAlerts)
	prometheus.MustRegister(metricAlertGroups)
	prometheus.MustRegister(metricAlertmanagerErrors)
	prometheus.MustRegister(metricCollectRuns)
}
