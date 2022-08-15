package intern

import "sync"

type Interner struct {
	mu   sync.RWMutex
	data map[string]string
}

func New() *Interner {
	return &Interner{data: map[string]string{}}
}

func (i *Interner) Flush() {
	i.mu.Lock()
	i.data = map[string]string{}
	i.mu.Unlock()
}

func (i *Interner) String(s string) string {
	i.mu.RLock()
	interned, ok := i.data[s]
	i.mu.RUnlock()

	if ok {
		return interned
	}

	i.mu.Lock()
	i.data[s] = s
	i.mu.Unlock()

	return s
}
