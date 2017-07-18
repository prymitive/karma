package ginpprof

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newServer() *gin.Engine {
	r := gin.Default()
	return r
}

func checkRouters(routers gin.RoutesInfo, t *testing.T) {
	expectedRouters := map[string]string{
		"/debug/pprof/":             "IndexHandler",
		"/debug/pprof/heap":         "HeapHandler",
		"/debug/pprof/goroutine":    "GoroutineHandler",
		"/debug/pprof/block":        "BlockHandler",
		"/debug/pprof/threadcreate": "ThreadCreateHandler",
		"/debug/pprof/cmdline":      "CmdlineHandler",
		"/debug/pprof/profile":      "ProfileHandler",
		"/debug/pprof/symbol":       "SymbolHandler",
		"/debug/pprof/trace":        "TraceHandler",
		"/debug/pprof/mutex":        "MutexHandler",
	}

	for _, router := range routers {
		//fmt.Println(router.Path, router.Method, router.Handler)
		name, ok := expectedRouters[router.Path]
		if !ok {
			t.Errorf("missing router %s", router.Path)
		}
		if !strings.Contains(router.Handler, name) {
			t.Errorf("handler for %s should contain %s, got %s", router.Path, name, router.Handler)
		}
	}
}

func TestWrap(t *testing.T) {
	r := newServer()
	Wrap(r)
	checkRouters(r.Routes(), t)
}

func TestWrapGroup(t *testing.T) {
	for _, prefix := range []string{"/debug", "/debug/", "/debug/pprof", "/debug/pprof/"} {
		r := newServer()
		g := r.Group(prefix)
		WrapGroup(g)
		checkRouters(r.Routes(), t)
	}
}
