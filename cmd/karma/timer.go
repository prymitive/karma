package main

import (
	"runtime"
	"sync"
	"time"

	"github.com/prymitive/karma/internal/alertmanager"

	"github.com/rs/zerolog/log"
)

var (
	lastPull time.Time
)

func pullFromAlertmanager() {
	// always flush cache once we're done
	defer apiCache.Flush()

	// Ensure that we're not putting write locks in a tight loop
	// We need at least 5s since last pull
	nextPull := lastPull.Add(time.Second * 5)
	waitNeeded := time.Until(nextPull)
	if waitNeeded > 0 {
		log.Warn().Dur("wait", waitNeeded).Msg("Less than 5s since the last pull, will wait before next cycle to process client requests, try increasing alertmanager.interval option if you see this warning too often")
		time.Sleep(waitNeeded)
	}

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

	lastPull = time.Now()
}

// Tick is the background timer used to call PullFromAlertmanager
func Tick() {
	for range ticker.C {
		pullFromAlertmanager()
	}
}
