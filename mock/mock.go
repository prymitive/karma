package mock

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"runtime"

	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

// RegisterURL for given url and return 200 status register mock http responder
func RegisterURL(url string, version string, filename string) {
	_, f, _, _ := runtime.Caller(0)
	cwd := filepath.Dir(f)
	fullPath := fmt.Sprintf("%s/%s/api/v1/%s", cwd, version, filename)
	mockJSON, err := ioutil.ReadFile(fullPath)
	if err != nil {
		panic(err)
	}
	if len(mockJSON) == 0 {
		panic(fmt.Errorf("Empty mock file '%s'", fullPath))
	}
	httpmock.RegisterResponder("GET", url, httpmock.NewBytesResponder(200, mockJSON))
}
