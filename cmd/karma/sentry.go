package main

import (
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/getsentry/raven-go"
	"github.com/rs/zerolog/log"
)

// copied from https://github.com/loikg/ravenchi, adapted for chi v5
func sentryRecovery(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rval := recover(); rval != nil {
				log.Error().Err(fmt.Errorf("%+v", rval)).Bytes("stack", debug.Stack()).Msg("Panic")
				rvalStr := fmt.Sprint(rval)
				var packet *raven.Packet
				if err, ok := rval.(error); ok {
					packet = raven.NewPacket(rvalStr, raven.NewException(errors.New(rvalStr), raven.GetOrNewStacktrace(err, 2, 3, nil)), raven.NewHttp(r))
				} else {
					packet = raven.NewPacket(rvalStr, raven.NewException(errors.New(rvalStr), raven.NewStacktrace(2, 3, nil)), raven.NewHttp(r))
				}
				raven.Capture(packet, nil)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			}
		}()
		handler.ServeHTTP(w, r)
	})
}
