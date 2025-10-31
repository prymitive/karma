package verprobe

import (
	"fmt"
	"io"

	"github.com/prometheus/common/expfmt"
	"github.com/prometheus/common/model"
)

const (
	buildInfoMetric = "alertmanager_build_info"
	versionLabel    = "version"
)

// Detect alertmanager version by reading metrics it exposes
func Detect(r io.Reader) (string, error) {
	parser := expfmt.NewTextParser(model.UTF8Validation)

	metrics, err := parser.TextToMetricFamilies(r)
	if err != nil {
		return "", err
	}

	for name, m := range metrics {
		if name == buildInfoMetric {
			for _, v := range m.Metric {
				for _, l := range v.Label {
					if l.GetName() == versionLabel {
						return l.GetValue(), nil
					}
				}
			}
		}
	}

	return "", fmt.Errorf("%s{%s=...} metric is not exported from alertmanger", buildInfoMetric, versionLabel)
}
