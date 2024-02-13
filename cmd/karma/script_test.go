package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"os"
	"path"
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
			"cert": tlsCert,
		},
		Setup: func(env *testscript.Env) error {
			env.Values["mocks"] = &httpMocks{responses: map[string][]httpMock{}}
			return nil
		},
	})
}

func httpServer(ts *testscript.TestScript, _ bool, args []string) {
	mocks := ts.Value("mocks").(*httpMocks)

	if len(args) == 0 {
		ts.Fatalf("! http command requires arguments")
	}
	cmd := args[0]

	ts.Logf("test-script http command: %s", strings.Join(args, " "))

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
		mocks.add(name, httpMock{pattern: path, handler: func(w http.ResponseWriter, _ *http.Request) {
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
		mocks.add(name, httpMock{pattern: path, handler: func(w http.ResponseWriter, _ *http.Request) {
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
		mocks.add(name, httpMock{pattern: srcpath, handler: func(w http.ResponseWriter, _ *http.Request) {
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
		mux.HandleFunc("/__ping__", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("pong"))
		})
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
		sChan := make(chan struct{}, 1)
		sCtx, sCancel := context.WithTimeout(context.Background(), time.Minute*5)

		ts.Defer(func() {
			ts.Logf("running deferred http server shutdown")
			defer sCancel()
			sChan <- struct{}{}
			ts.Logf("http server %s shutting down", name)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(ctx)
		})

		go func() {
			select {
			case <-sCtx.Done():
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				_ = server.Shutdown(ctx)
				ts.Fatalf("http server %s running for too long, forcing a shutdown: %s", name, sCtx.Err())
			case <-sChan:
				return
			}
		}()

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

		tr := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
		client := &http.Client{Transport: tr}

		try := 0
		for {
			try++
			if try > 30 {
				ts.Fatalf("HTTP server didn't pass healt checks after %d check(s)", try)
			}

			ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)

			uri := fmt.Sprintf("http://%s/__ping__", listen)
			if isTLS {
				uri = fmt.Sprintf("https://%s/__ping__", listen)
			}

			req, err := http.NewRequestWithContext(ctx, http.MethodGet, uri, nil)
			ts.Check(err)

			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				ts.Logf("http server ready after %d check(s)", try)
				cancel()
				return
			}

			cancel()
			time.Sleep(time.Second)
		}
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

func tlsCert(ts *testscript.TestScript, _ bool, args []string) {
	if len(args) < 2 {
		ts.Fatalf("! cert command requires '$DIRNAME $NAME' args, got [%s]", strings.Join(args, " "))
	}
	dirname := args[0]
	name := args[1]

	ts.Logf("test-script cert command: %s", strings.Join(args, " "))

	ca := &x509.Certificate{
		SerialNumber: big.NewInt(2019),
		Subject: pkix.Name{
			Organization:  []string{"Company, INC."},
			Country:       []string{"US"},
			Province:      []string{""},
			Locality:      []string{"San Francisco"},
			StreetAddress: []string{""},
			PostalCode:    []string{""},
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().AddDate(10, 0, 0),
		IsCA:                  true,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
	}

	caPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		ts.Fatalf("failed to generate CA private key: %s", err)
	}

	caBytes, err := x509.CreateCertificate(rand.Reader, ca, ca, &caPrivKey.PublicKey, caPrivKey)
	if err != nil {
		ts.Fatalf("failed to generate CA cert: %s", err)
	}

	writeCert(ts, dirname, name+"-ca.pem", &pem.Block{
		Type:  "CERTIFICATE",
		Bytes: caBytes,
	})
	writeCert(ts, dirname, name+"-ca.key", &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(caPrivKey),
	})

	cert := &x509.Certificate{
		SerialNumber: big.NewInt(1658),
		Subject: pkix.Name{
			Organization:  []string{""},
			Country:       []string{""},
			Province:      []string{""},
			Locality:      []string{""},
			StreetAddress: []string{""},
			PostalCode:    []string{""},
		},
		IPAddresses:  []net.IP{net.IPv4(127, 0, 0, 1), net.IPv6loopback},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().AddDate(0, 0, 1),
		SubjectKeyId: []byte{1, 2, 3, 4, 6},
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		KeyUsage:     x509.KeyUsageDigitalSignature,
	}

	certPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		ts.Fatalf("failed to generate cert private key: %s", err)
	}

	certBytes, err := x509.CreateCertificate(rand.Reader, cert, ca, &certPrivKey.PublicKey, caPrivKey)
	if err != nil {
		ts.Fatalf("failed to generate cert: %s", err)
	}

	writeCert(ts, dirname, name+".pem", &pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certBytes,
	})
	writeCert(ts, dirname, name+".key", &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(certPrivKey),
	})
}

func writeCert(ts *testscript.TestScript, dirname, filename string, block *pem.Block) {
	fullpath := path.Join(dirname, filename)

	f, err := os.Create(fullpath)
	if err != nil {
		ts.Fatalf("failed to write %s: %s", fullpath, err)
	}

	if err = pem.Encode(f, block); err != nil {
		ts.Fatalf("failed to encode %s: %s", fullpath, err)
	}

	if err = f.Close(); err != nil {
		ts.Fatalf("failed to close %s: %s", fullpath, err)
	}
}
