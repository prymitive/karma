package alertmanager

import (
	"github.com/prymitive/karma/internal/mapper"
	v017 "github.com/prymitive/karma/internal/mapper/v017"
)

// initialize all mappers
func init() {
	mapper.RegisterAlertMapper(v017.AlertMapper{})
	mapper.RegisterSilenceMapper(v017.SilenceMapper{})
}
