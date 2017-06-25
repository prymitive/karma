package alertmanager

import (
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/transport"

	log "github.com/Sirupsen/logrus"
)

// AlertmanagerVersion is what api/v1/status returns, we only use it to check
// version, so we skip all other keys (except for status)
type alertmanagerVersion struct {
	Status string `json:"status"`
	Data   struct {
		VersionInfo struct {
			Version string `json:"version"`
		} `json:"versionInfo"`
	} `json:"data"`
}

// GetVersion returns version information of the remote Alertmanager endpoint
func GetVersion(uri string, timeout time.Duration) string {
	// if everything fails assume Alertmanager is at latest possible version
	defaultVersion := "999.0.0"

	url, err := transport.JoinURL(uri, "api/v1/status")
	if err != nil {
		log.Errorf("Failed to join url '%s' and path 'api/v1/status': %s", config.Config.AlertmanagerURI, err.Error())
		return defaultVersion
	}
	ver := alertmanagerVersion{}
	err = transport.ReadJSON(url, timeout, &ver)
	if err != nil {
		log.Errorf("%s request failed: %s", url, err.Error())
		return defaultVersion
	}

	if ver.Status != "success" {
		log.Errorf("Request to %s returned status %s", url, ver.Status)
		return defaultVersion
	}

	if ver.Data.VersionInfo.Version == "" {
		log.Error("No version information in Alertmanager API")
		return defaultVersion
	}

	log.Infof("Remote Alertmanager version: %s", ver.Data.VersionInfo.Version)
	return ver.Data.VersionInfo.Version
}
