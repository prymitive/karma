package alertmanager

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
