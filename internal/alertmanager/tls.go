package alertmanager

import (
	"crypto/tls"
	"crypto/x509"
	"log/slog"
	"net/http"
	"os"
)

func configureTLSRootCAs(tlsConfig *tls.Config, caPath string) error {
	slog.Debug("Loading TLS CA cert", slog.String("path", caPath))
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
	slog.Debug("Loading TLS cert and key", slog.String("cert", certPath), slog.String("key", keyPath))
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		slog.Debug("Failed to load TLS cert and key", slog.Any("error", err))
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

	transport := http.Transport{TLSClientConfig: tlsConfig, DisableCompression: true}
	return &transport, nil
}
