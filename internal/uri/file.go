package uri

import (
	"io"
	"net/url"
	"os"
	"path"
	"strings"

	log "github.com/sirupsen/logrus"
)

type fileReader struct {
	fd *os.File
}

func (fr *fileReader) Read(b []byte) (n int, err error) {
	return fr.fd.Read(b)
}

func (fr *fileReader) Close() error {
	return fr.fd.Close()
}

// FileURIReader can read data from file:// URIs
type FileURIReader struct {
}

func (r *FileURIReader) pathFromURI(uri string) (string, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return "", err
	}

	// if we a file URI with an absolute path then return it
	if strings.HasPrefix(uri, "file:///") {
		return u.Path, nil
	}
	// if we have a file URI with relative path we need to expand it into an
	// absolute path, url.Parse doesn't support relative file paths
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	absolutePath := path.Join(cwd, u.Host, u.Path)
	return absolutePath, nil
}

func (r *FileURIReader) Read(uri string, _ map[string]string) (io.ReadCloser, error) {
	filename, err := r.pathFromURI(uri)
	if err != nil {
		return nil, err
	}

	log.Infof("Reading file '%s'", filename)
	fd, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	fr := fileReader{fd: fd}
	return &fr, nil
}
