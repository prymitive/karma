package transport

import (
	"io"
	"os"

	log "github.com/Sirupsen/logrus"
)

type fileReader struct {
	filename string
	fd       *os.File
}

func (fr *fileReader) Read(b []byte) (n int, err error) {
	return fr.fd.Read(b)
}

func (fr *fileReader) Close() error {
	return fr.fd.Close()
}

func newFileReader(filname string) (io.ReadCloser, error) {
	log.Infof("Reading file '%s'", filname)
	fd, err := os.Open(filname)
	fr := fileReader{filename: filname, fd: fd}
	return &fr, err
}
