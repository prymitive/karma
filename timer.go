package main

import (
	"runtime"
	"sync"

	"github.com/prymitive/karma/internal/alertmanager"

	log "github.com/sirupsen/logrus"
)

func pullFromAlertmanager() {
	// always flush cache once we're done
	defer apiCache.Flush()

	log.Info("Pulling latest alerts and silences from Alertmanager")

	upstreams := alertmanager.GetAlertmanagers()
	wg := sync.WaitGroup{}
	wg.Add(len(upstreams))

	for _, upstream := range upstreams {
		go func(am *alertmanager.Alertmanager) {
			log.Infof("[%s] Collecting alerts and silences", am.Name)
			err := am.Pull()
			if err != nil {
				log.Errorf("[%s] %s", am.Name, err)
			}
			wg.Done()
		}(upstream)
	}

	wg.Wait()

	log.Info("Pull completed")
	runtime.GC()
}

// Tick is the background timer used to call PullFromAlertmanager
func Tick() {
	for range ticker.C {
		pullFromAlertmanager()
	}
}
