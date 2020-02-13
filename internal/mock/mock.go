package mock

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"runtime"

	"github.com/jarcoal/httpmock"
)

// GetAbsoluteMockPath returns absolute path for given mock file
func GetAbsoluteMockPath(filename string, version string) string {
	_, f, _, _ := runtime.Caller(0)
	cwd := filepath.Dir(f)
	return path.Join(cwd, version, filename)
}

// GetMockResponder returns a httpmock.Responder for given file/version
func GetMockResponder(url string, version string, filename string) httpmock.Responder {
	fullPath := GetAbsoluteMockPath(filename, version)
	mockJSON, err := ioutil.ReadFile(fullPath)
	if err != nil {
		panic(fmt.Errorf("failed to read %s: %s", fullPath, err))
	}
	if len(mockJSON) == 0 {
		panic(fmt.Errorf("empty mock file '%s'", fullPath))
	}
	return httpmock.NewBytesResponder(200, mockJSON)
}

// RegisterURL for given url and return 200 status register mock http responder
func RegisterURL(url string, version string, filename string) {
	httpmock.RegisterResponder("GET", url, GetMockResponder(url, version, filename))
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
