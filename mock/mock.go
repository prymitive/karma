package mock

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"runtime"

	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

// GetAbsoluteMockPath returns absolute path for given mock file
func GetAbsoluteMockPath(filename string, version string) string {
	_, f, _, _ := runtime.Caller(0)
	cwd := filepath.Dir(f)
	return path.Join(cwd, version, "api/v1", filename)
}

// RegisterURL for given url and return 200 status register mock http responder
func RegisterURL(url string, version string, filename string) {
	fullPath := GetAbsoluteMockPath(filename, version)
	mockJSON, err := ioutil.ReadFile(fullPath)
	if err != nil {
		panic(err)
	}
	if len(mockJSON) == 0 {
		panic(fmt.Errorf("Empty mock file '%s'", fullPath))
	}
	httpmock.RegisterResponder("GET", url, httpmock.NewBytesResponder(200, mockJSON))
}

// ListAllMocks will return a list of all mock versions we have files for
func ListAllMocks() []string {
	_, f, _, _ := runtime.Caller(0)
	cwd := filepath.Dir(f)

	dirents, err := ioutil.ReadDir(cwd)
	if err != nil {
		panic(err)
	}

	dirs := []string{}
	for _, dirent := range dirents {
		if dirent.IsDir() {
			_, err := os.Stat(path.Join(cwd, dirent.Name(), "api"))
			if err == nil {
				dirs = append(dirs, dirent.Name())
			}
		}
	}
	return dirs
}

// ListAllMockURIs returns a list of mock APIs as file:// URIs
func ListAllMockURIs() []string {
	uris := []string{}
	_, f, _, _ := runtime.Caller(0)
	cwd := filepath.Dir(f)
	for _, version := range ListAllMocks() {
		uris = append(uris, "file://"+path.Join(cwd, version))
	}
	return uris
}
