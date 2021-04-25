package main

import (
	"runtime"
	"sync"

	"github.com/prymitive/karma/internal/alertmanager"

	"github.com/rs/zerolog/log"
)

func pullFromAlertmanager() {
	// always flush cache once we're done
	defer apiCache.Purge()

	log.Info().Msg("Pulling latest alerts and silences from Alertmanager")

	upstreams := alertmanager.GetAlertmanagers()
	wg := sync.WaitGroup{}
	wg.Add(len(upstreams))

	for _, upstream := range upstreams {
		go func(am *alertmanager.Alertmanager) {
			log.Info().Str("alertmanager", am.Name).Msg("Collecting alerts and silences")
			err := am.Pull()
			if err != nil {
				log.Error().Err(err).Str("alertmanager", am.Name).Msg("Collection failed")
			}
			wg.Done()
		}(upstream)
	}

	wg.Wait()

	log.Info().Msg("Collection completed")
	runtime.GC()
}

// Tick is the background timer used to call PullFromAlertmanager
func Tick() {
	for range ticker.C {
		pullFromAlertmanager()
	}
}
