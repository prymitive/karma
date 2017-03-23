package main

import (
	"fmt"
	"io/ioutil"
	"strings"

	log "github.com/Sirupsen/logrus"
)

// ReadAssets will read assets.txt file in given directory and return a list
// of file names in that file
// assets.txt contains a list of external js of css files that are mirrored
// in static/assets directory that should be loaded in the browser
// this way we don't have to maintain this list in the Makefile that does
// the mirroring and in the template
func ReadAssets(kind string) []string {
	filename := fmt.Sprintf("./static/assets/%s/assets.txt", kind)
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		log.Error(err.Error())
		return []string{}
	}

	lines := strings.Split(string(content), "\n")

	ret := []string{}
	for _, l := range lines {
		if l != "" {
			ret = append(ret, l)
		}
	}

	return ret
}
