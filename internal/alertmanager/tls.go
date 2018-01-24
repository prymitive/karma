package alertmanager

import (
	"crypto/tls"
	"crypto/x509"
	"io/ioutil"
	"net/http"

	log "github.com/sirupsen/logrus"
)

func configureTLSRootCAs(tlsConfig *tls.Config, caPath string) error {
	log.Debugf("Loading TLS CA cert '%s'", caPath)
	caCert, err := ioutil.ReadFile(caPath)
	if err != nil {
		return err
	}
	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)
	tlsConfig.RootCAs = caCertPool
	return nil
}

func configureTLSClientCert(tlsConfig *tls.Config, certPath, keyPath string) error {
	log.Debugf("Loading TLS cert '%s' and key '%s'", certPath, keyPath)
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		log.Debugf("Failed to load TLS cert and key: %s", err)
		return err
	}
	tlsConfig.Certificates = []tls.Certificate{cert}
	tlsConfig.BuildNameToCertificate()
	return nil
}

func NewHTTTPTransport(caPath, certPath, keyPath string) (http.RoundTripper, error) {
	tlsConfig := &tls.Config{}

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
