package verprobe

import (
	"io"

	"github.com/prometheus/common/expfmt"
)

const (
	buildInfoMetric = "alertmanager_build_info"
	versionLabel    = "version"
)

// Detect alertmanager version by reading metrics it exposes
func Detect(r io.Reader) (string, error) {
	parser := expfmt.TextParser{}

	metrics, err := parser.TextToMetricFamilies(r)
	if err != nil {
		return "", err
	}

	version := ""
	for name, m := range metrics {
		if name == buildInfoMetric {
			for _, v := range m.Metric {
				for _, l := range v.Label {
					if l.GetName() == versionLabel {
						version = l.GetValue()
						break
					}
				}
			}
		}
	}

	return version, nil
}
