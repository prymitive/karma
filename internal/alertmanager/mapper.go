package alertmanager

import (
	"github.com/prymitive/karma/internal/mapper"
	v015 "github.com/prymitive/karma/internal/mapper/v015"
	v017 "github.com/prymitive/karma/internal/mapper/v017"
	v04 "github.com/prymitive/karma/internal/mapper/v04"
	v05 "github.com/prymitive/karma/internal/mapper/v05"
	v061 "github.com/prymitive/karma/internal/mapper/v061"
	v062 "github.com/prymitive/karma/internal/mapper/v062"
)

// initialize all mappers
func init() {
	mapper.RegisterAlertMapper(v04.AlertMapper{})
	mapper.RegisterAlertMapper(v05.AlertMapper{})
	mapper.RegisterAlertMapper(v061.AlertMapper{})
	mapper.RegisterAlertMapper(v062.AlertMapper{})
	mapper.RegisterSilenceMapper(v04.SilenceMapper{})
	mapper.RegisterSilenceMapper(v05.SilenceMapper{})
	mapper.RegisterAlertMapper(v017.AlertMapper{})
	mapper.RegisterSilenceMapper(v017.SilenceMapper{})
	mapper.RegisterStatusMapper(v04.StatusMapper{})
	mapper.RegisterStatusMapper(v015.StatusMapper{})
	mapper.RegisterStatusMapper(v017.StatusMapper{})
}
