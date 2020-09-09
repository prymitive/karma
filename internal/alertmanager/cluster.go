package alertmanager

func clusterMembersFromConfig(am *Alertmanager) []string {
	members := []string{}

	upstreams := GetAlertmanagers()
	for _, upstream := range upstreams {
		if upstream.ClusterName() == am.ClusterName() {
			members = append(members, upstream.Name)
		}
	}

	return members
}

func clusterMembersFromAPI(am *Alertmanager) []string {
	return am.ClusterMemberNames()
}
