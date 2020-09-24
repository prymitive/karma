package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prymitive/karma/internal/alertmanager"
)

type karmaCollector struct {
	collectedAlerts *prometheus.Desc
	collectedGroups *prometheus.Desc
	cyclesTotal     *prometheus.Desc
	errorsTotal     *prometheus.Desc
	alertmanagerUp  *prometheus.Desc
}

func newKarmaCollector() *karmaCollector {
	return &karmaCollector{
		collectedAlerts: prometheus.NewDesc(
			"karma_collected_alerts_count",
			"Total number of alerts collected from Alertmanager API",
			[]string{"alertmanager", "state", "receiver"},
			prometheus.Labels{},
		),
		collectedGroups: prometheus.NewDesc(
			"karma_collected_groups_count",
			"Total number of alert groups collected from Alertmanager API",
			[]string{"alertmanager", "receiver"},
			prometheus.Labels{},
		),
		cyclesTotal: prometheus.NewDesc(
			"karma_collect_cycles_total",
			"Total number of alert collection cycles run",
			[]string{"alertmanager"},
			prometheus.Labels{},
		),
		errorsTotal: prometheus.NewDesc(
			"karma_alertmanager_errors_total",
			"Total number of errors encounter when requesting data from Alertmanager API",
			[]string{"alertmanager", "endpoint"},
			prometheus.Labels{},
		),
		alertmanagerUp: prometheus.NewDesc(
			"karma_alertmanager_up",
			"1 if last call to Alertmanager API succeeded",
			[]string{"alertmanager"},
			prometheus.Labels{},
		),
	}
}

func (c *karmaCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.collectedAlerts
	ch <- c.collectedGroups
	ch <- c.cyclesTotal
	ch <- c.errorsTotal
	ch <- c.alertmanagerUp
}

func (c *karmaCollector) Collect(ch chan<- prometheus.Metric) {
	upstreams := alertmanager.GetAlertmanagers()

	for _, am := range upstreams {

		ch <- prometheus.MustNewConstMetric(
			c.cyclesTotal,
			prometheus.CounterValue,
			am.Metrics.Cycles,
			am.Name,
		)
		for key, val := range am.Metrics.Errors {
			ch <- prometheus.MustNewConstMetric(
				c.errorsTotal,
				prometheus.CounterValue,
				val,
				am.Name,
				key,
			)
		}

		// receiver name -> count
		groupsByReceiver := map[string]float64{}
		// receiver name -> state -> count
		alertsByReceiverByState := map[string]map[string]float64{}

		// iterate all alert groups this instance stores
		for _, group := range am.Alerts() {
			// count all groups per receiver
			if _, found := groupsByReceiver[group.Receiver]; !found {
				groupsByReceiver[group.Receiver] = 0
			}
			groupsByReceiver[group.Receiver]++

			// count all alerts per receiver & state
			for _, alert := range group.Alerts {
				if _, found := alertsByReceiverByState[alert.Receiver]; !found {
					alertsByReceiverByState[alert.Receiver] = map[string]float64{
						"unprocessed": 0,
						"active":      0,
						"suppressed":  0,
					}
				}
				alertsByReceiverByState[alert.Receiver][alert.State]++
			}
		}

		// publish metrics using calculated values
		for reciver, count := range groupsByReceiver {
			ch <- prometheus.MustNewConstMetric(
				c.collectedGroups,
				prometheus.GaugeValue,
				count,
				am.Name,
				reciver,
			)
		}
		for reciver, byState := range alertsByReceiverByState {
			for state, count := range byState {
				ch <- prometheus.MustNewConstMetric(
					c.collectedAlerts,
					prometheus.GaugeValue,
					count,
					am.Name,
					state,
					reciver,
				)
			}
		}

		ch <- prometheus.MustNewConstMetric(
			c.alertmanagerUp,
			prometheus.GaugeValue,
			boolToFloat64(am.Error() == ""),
			am.Name,
		)
	}
}

func init() {
	prometheus.MustRegister(newKarmaCollector())
}

func boolToFloat64(b bool) float64 {
	if b {
		return 1
	}
	return 0
}
