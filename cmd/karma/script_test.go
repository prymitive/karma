package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/beme/abide"
	"github.com/rogpeppe/go-internal/testscript"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
)

func mainShoulFail() int {
	initLogger()
	err := serve(pflag.ContinueOnError)
	if err != nil {
		log.Error().Err(err).Msg("Execution failed")
		return 0
	}
	log.Error().Msg("No error logged")
	return 100
}

func mainShouldWork() int {
	initLogger()
	err := serve(pflag.ContinueOnError)
	if err != nil {
		log.Error().Err(err).Msg("Execution failed")
		return 100
	}
	return 0
}

func TestMain(m *testing.M) {
	ecode := testscript.RunMain(m, map[string]func() int{
		"karma.bin-should-fail": mainShoulFail,
		"karma.bin-should-work": mainShouldWork,
	})
	err := abide.Cleanup()
	if err != nil {
		fmt.Printf("abide.Cleanup() error: %v\n", err)
		ecode = 1
	}
	os.Exit(ecode)
}

func TestScripts(t *testing.T) {
	testscript.Run(t, testscript.Params{
		Dir:           "tests/testscript",
		UpdateScripts: os.Getenv("UPDATE_SNAPSHOTS") == "1",
		Cmds: map[string]func(ts *testscript.TestScript, neg bool, args []string){
			"http": httpServer,
		},
		Setup: func(env *testscript.Env) error {
			env.Values["mocks"] = &httpMocks{responses: map[string][]httpMock{}}
			return nil
		},
	})
}

func httpServer(ts *testscript.TestScript, neg bool, args []string) {
	mocks := ts.Value("mocks").(*httpMocks)

	if len(args) == 0 {
		ts.Fatalf("! http command requires arguments")
	}
	cmd := args[0]

	switch cmd {
	// http response name /200 200 OK
	case "response":
		if len(args) < 5 {
			ts.Fatalf("! http response command requires '$NAME $PATH $CODE $BODY' args, got [%s]", strings.Join(args, " "))
		}
		name := args[1]
		path := args[2]
		code, err := strconv.Atoi(args[3])
		ts.Check(err)
		body := strings.Join(args[4:], " ")
		mocks.add(name, httpMock{pattern: path, handler: func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(code)
			_, err := w.Write([]byte(body))
			ts.Check(err)
		}})
	// http response name /200 200 OK
	case "slow-response":
		if len(args) < 6 {
			ts.Fatalf("! http response command requires '$NAME $PATH $DELAY $CODE $BODY' args, got [%s]", strings.Join(args, " "))
		}
		name := args[1]
		path := args[2]
		delay, err := time.ParseDuration(args[3])
		ts.Check(err)
		code, err := strconv.Atoi(args[4])
		ts.Check(err)
		body := strings.Join(args[5:], " ")
		mocks.add(name, httpMock{pattern: path, handler: func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(delay)
			w.WriteHeader(code)
			_, err := w.Write([]byte(body))
			ts.Check(err)
		}})
	// http redirect name /foo/src /dst
	case "redirect":
		if len(args) != 4 {
			ts.Fatalf("! http redirect command requires '$NAME $SRCPATH $DSTPATH' args, got [%s]", strings.Join(args, " "))
		}
		name := args[1]
		srcpath := args[2]
		dstpath := args[3]
		mocks.add(name, httpMock{pattern: srcpath, handler: func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Location", dstpath)
			w.WriteHeader(http.StatusFound)
		}})
	// http start name 127.0.0.1:7088 [TLS cert] [TLS key]
	case "start":
		if len(args) < 3 {
			ts.Fatalf("! http start command requires '$NAME $LISTEN [$TLS_CERT $TLS_KEY]' args, got [%s]", strings.Join(args, " "))
		}
		name := args[1]
		listen := args[2]
		var isTLS bool
		var tlsCert, tlsKey string
		if len(args) == 5 {
			isTLS = true
			tlsCert = args[3]
			tlsKey = args[4]
		}

		mux := http.NewServeMux()
		for n, mockList := range mocks.responses {
			if n == name {
				for _, mock := range mockList {
					mock := mock
					mux.HandleFunc(mock.pattern, mock.handler)
				}
				break
			}
		}

		listener, err := net.Listen("tcp", listen)
		ts.Check(err)
		server := &http.Server{Addr: listen, Handler: mux}
		go func() {
			if isTLS {
				err = server.ServeTLS(listener, tlsCert, tlsKey)
			} else {
				err = server.Serve(listener)
			}
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				ts.Fatalf("http server failed to start: %s", err)
			}
		}()

		ts.Defer(func() {
			ts.Logf("http server %s shutting down", name)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(ctx)
		})
	default:
		ts.Fatalf("! unknown http command: %v", args)
	}
}

type httpMock struct {
	pattern string
	handler func(http.ResponseWriter, *http.Request)
}

type httpMocks struct {
	responses map[string][]httpMock
}

func (m *httpMocks) add(name string, mock httpMock) {
	if _, ok := m.responses[name]; !ok {
		m.responses[name] = []httpMock{}
	}
	m.responses[name] = append(m.responses[name], mock)
}
