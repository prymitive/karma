package main

import (
	"fmt"
	"runtime"
	"sync"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/intern"

	"github.com/rs/zerolog/log"
)

const (
	maxTries = 2
)

func pullFromAlertmanager() {
	// always flush cache once we're done
	defer apiCache.Purge()

	si := intern.New()

	log.Info().Msg("Pulling latest alerts and silences from Alertmanager")

	upstreams := alertmanager.GetAlertmanagers()
	wg := sync.WaitGroup{}
	wg.Add(len(upstreams))

	for _, upstream := range upstreams {
		go func(am *alertmanager.Alertmanager) {
			log.Info().Str("alertmanager", am.Name).Msg("Collecting alerts and silences")
			for i := 1; i <= maxTries; i++ {
				err := am.Pull(si)
				if err != nil {
					log.Error().
						Err(err).
						Str("alertmanager", am.Name).
						Str("try", fmt.Sprintf("%d/%d", i, maxTries)).
						Msg("Collection failed")
				} else {
					break
				}
			}
			wg.Done()
		}(upstream)
	}

	wg.Wait()

	log.Info().Msg("Collection completed")
	si.Flush()
	runtime.GC()
}

// Tick is the background timer used to call PullFromAlertmanager
func Tick() {
	for range ticker.C {
		pullFromAlertmanager()
	}
}
