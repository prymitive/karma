package alertmanager

import (
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"os"

	"github.com/rs/zerolog/log"
)

func configureTLSRootCAs(tlsConfig *tls.Config, caPath string) error {
	log.Debug().
		Str("path", caPath).
		Msg("Loading TLS CA cert")
	caCert, err := os.ReadFile(caPath)
	if err != nil {
		return err
	}
	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)
	tlsConfig.RootCAs = caCertPool
	return nil
}

func configureTLSClientCert(tlsConfig *tls.Config, certPath, keyPath string) error {
	log.Debug().
		Str("cert", certPath).
		Str("key", keyPath).
		Msg("Loading TLS cert and key")
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		log.Debug().Err(err).Msg("Failed to load TLS cert and key")
		return err
	}
	tlsConfig.Certificates = []tls.Certificate{cert}
	return nil
}

// NewHTTPTransport handles the logic of creating a http.RoundTripper instance
// with properl tls.Config setup
func NewHTTPTransport(caPath, certPath, keyPath string, insecureSkipVerify bool) (http.RoundTripper, error) {
	tlsConfig := &tls.Config{InsecureSkipVerify: insecureSkipVerify}

	if caPath != "" {
		err := configureTLSRootCAs(tlsConfig, caPath)
		if err != nil {
			return nil, err
		}
	}

	if certPath != "" {
		err := configureTLSClientCert(tlsConfig, certPath, keyPath)
		if err != nil {
			return nil, err
		}
	}

	transport := http.Transport{TLSClientConfig: tlsConfig}
	return &transport, nil
}
