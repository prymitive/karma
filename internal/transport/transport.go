package transport

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"strings"
	"time"
)

// ReadJSON using one of supported transports (file:// http://)
func ReadJSON(uri string, timeout time.Duration, target interface{}) error {
	u, err := url.Parse(uri)
	if err != nil {
		return err
	}
	var reader io.ReadCloser
	switch u.Scheme {
	case "http", "https":
		reader, err = newHTTPReader(u.String(), timeout)
	case "file":
		// if we have a file URI with relative path we need to expand it into an
		// absolute path, url.Parse doesn't support relative file paths
		if strings.HasPrefix(uri, "file:///") {
			reader, err = newFileReader(u.Path)
		} else {
			wd, e := os.Getwd()
			if e != nil {
				return e
			}
			absolutePath := path.Join(wd, strings.TrimPrefix(uri, "file://"))
			reader, err = newFileReader(absolutePath)
		}
	default:
		return fmt.Errorf("Unsupported URI scheme '%s' in '%s'", u.Scheme, u)
	}
	if err != nil {
		return err
	}
	defer reader.Close()
	return json.NewDecoder(reader).Decode(target)
}
