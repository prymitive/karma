package transport

import (
	"os"

	log "github.com/Sirupsen/logrus"
)

type fileReader struct {
	filename string
}

func newFileReader(filname string) (*os.File, error) {
	log.Infof("Reading file '%s'", filname)
	return os.Open(filname)
}
