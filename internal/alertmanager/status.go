package alertmanager

type v06MeshPeer struct {
	Name     string `json:"name"`
	NickName string `json:"nickName"`
}

type v06CMeshStatus struct {
	Name     string        `json:"name"`
	NickName string        `json:"nickName"`
	Peers    []v06MeshPeer `json:"peers"`
}

type v015ClusterPeer struct {
	Address string `json:"address"`
	Name    string `json:"name"`
}

type v015ClusterStatus struct {
	Name   string            `json:"name"`
	Peers  []v015ClusterPeer `json:"peers"`
	Status string            `json:"status"`
}

type alertmanagerStatusResponse struct {
	Status string `json:"status"`
	Data   struct {
		VersionInfo struct {
			Version string `json:"version"`
		} `json:"versionInfo"`
		MeshStatus    v06CMeshStatus    `json:"meshStatus"`
		ClusterStatus v015ClusterStatus `json:"clusterStatus"`
	} `json:"data"`
}
