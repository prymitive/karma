package main

import (
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/slices"
)

func userGroups(username string) []string {
	groups := []string{}
	for _, authGroup := range config.Config.Authorization.Groups {
		if slices.StringInSlice(authGroup.Members, username) {
			groups = append(groups, authGroup.Name)
		}
	}
	return groups
}
