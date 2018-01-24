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

// FileTransport can read data from file:// URIs
type FileTransport struct {
}

func (t *FileTransport) pathFromURI(uri string) (string, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return "", err
	}

	// if we have a file URI with relative path we need to expand it into an
	// absolute path, url.Parse doesn't support relative file paths
	if strings.HasPrefix(uri, "file:///") {
		return u.Path, nil
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	absolutePath := path.Join(wd, strings.TrimPrefix(uri, "file://"))
	return absolutePath, nil
}

func (t *FileTransport) Read(uri string) (io.ReadCloser, error) {
	filename, err := t.pathFromURI(uri)
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
