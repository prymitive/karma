package config

import "net/url"

func hideURLPassword(s string) string {
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
