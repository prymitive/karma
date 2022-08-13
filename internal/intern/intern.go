package intern

type StringInterner map[string]string

func New() StringInterner {
	return StringInterner{}
}

func (si StringInterner) Intern(s string) string {
	interned, ok := si[s]
	if ok {
		return interned
	}
	si[s] = s
	return s
}
