package uri

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

// SanitizeURI returns a copy of an URI string with password replaced by "xxx"
func SanitizeURI(s string) string {
	u, err := url.Parse(s)
	if err != nil {
		return s
	}
	if u.User != nil {
		if _, pwdSet := u.User.Password(); pwdSet {
			u.User = url.UserPassword(u.User.Username(), "xxx")
		}
		return u.String()
	}
	return s
}
