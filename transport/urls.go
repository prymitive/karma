package transport

import (
	"net/url"
	"path"
)

// JoinURL can be used to join a base url (http(s)://domain.com) and a path (/my/path)
// it will return a joined string or an error (if you supply invalid url)
func JoinURL(base string, sub string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	u.Path = path.Join(u.Path, sub)
	return u.String(), nil
}
