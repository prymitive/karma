package v015

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/Masterminds/semver"
	"github.com/prymitive/karma/internal/mapper"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/uri"
)

type clusterPeer struct {
	Address string `json:"address"`
	Name    string `json:"name"`
}

type clusterStatus struct {
	Name   string        `json:"name"`
	Peers  []clusterPeer `json:"peers"`
	Status string        `json:"status"`
}

type alertmanagerStatusResponse struct {
	Status string `json:"status"`
	Data   struct {
		VersionInfo struct {
			Version string `json:"version"`
		} `json:"versionInfo"`
		ClusterStatus clusterStatus `json:"clusterStatus"`
	} `json:"data"`
}

// StatusMapper implements Alertmanager API schema
type StatusMapper struct {
	mapper.StatusMapper
}

// AbsoluteURL for status API endpoint this mapper supports
func (s StatusMapper) AbsoluteURL(baseURI string) (string, error) {
	return uri.JoinURL(baseURI, "api/v1/status")
}

// QueryArgs for HTTP requests send to the Alertmanager API endpoint
func (s StatusMapper) QueryArgs() string {
	return ""
}

// IsSupported returns true if given version string is supported
func (s StatusMapper) IsSupported(version string) bool {
	versionRange, err := semver.NewConstraint(">=0.15.0, <0.16.0")
	if err != nil {
		panic(err)
	}
	return versionRange.Check(semver.MustParse(version))
}

// IsOpenAPI returns true is remote Alertmanager uses OpenAPI
func (s StatusMapper) IsOpenAPI() bool {
	return false
}

// Decode Alertmanager API response body and return karma model instances
func (s StatusMapper) Decode(source io.ReadCloser) (models.AlertmanagerStatus, error) {
	status := models.AlertmanagerStatus{}
	resp := alertmanagerStatusResponse{}

	defer source.Close()
	err := json.NewDecoder(source).Decode(&resp)
	if err != nil {
		return status, err
	}

	if resp.Status != mapper.AlertmanagerStatusString {
		return status, fmt.Errorf("status endpoint returned status value '%s'", resp.Status)
	}

	if resp.Data.VersionInfo.Version == "" {
		return status, errors.New("no version information in Alertmanager status API")
	}

	status.Version = resp.Data.VersionInfo.Version

	status.ID = resp.Data.ClusterStatus.Name
	for _, peer := range resp.Data.ClusterStatus.Peers {
		status.PeerIDs = append(status.PeerIDs, peer.Name)
	}

	return status, nil
}
