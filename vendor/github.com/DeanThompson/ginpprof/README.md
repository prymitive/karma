ginpprof
========

[![GoDoc](https://godoc.org/github.com/DeanThompson/ginpprof?status.svg)](https://godoc.org/github.com/DeanThompson/ginpprof)
[![Build
Status](https://travis-ci.org/DeanThompson/ginpprof.svg?branch=master)](https://travis-ci.org/DeanThompson/ginpprof)

A wrapper for [golang web framework gin](https://github.com/gin-gonic/gin) to use `net/http/pprof` easily.

## Install

First install ginpprof to your GOPATH using `go get`:

```sh
go get github.com/DeanThompson/ginpprof
```

## Usage

```go
package main

import (
	"github.com/gin-gonic/gin"

	"github.com/DeanThompson/ginpprof"
)

func main() {
	router := gin.Default()

	router.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})

	// automatically add routers for net/http/pprof
	// e.g. /debug/pprof, /debug/pprof/heap, etc.
	ginpprof.Wrap(router)

	// ginpprof also plays well with *gin.RouterGroup
	// group := router.Group("/debug/pprof")
	// ginpprof.WrapGroup(group)

	router.Run(":8080")
}
```

Start this server, and you will see such outputs:

```text
[GIN-debug] GET    /ping                     --> main.main.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/             --> github.com/DeanThompson/ginpprof.IndexHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/heap         --> github.com/DeanThompson/ginpprof.HeapHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/goroutine    --> github.com/DeanThompson/ginpprof.GoroutineHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/block        --> github.com/DeanThompson/ginpprof.BlockHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/threadcreate --> github.com/DeanThompson/ginpprof.ThreadCreateHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/cmdline      --> github.com/DeanThompson/ginpprof.CmdlineHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/profile      --> github.com/DeanThompson/ginpprof.ProfileHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/symbol       --> github.com/DeanThompson/ginpprof.SymbolHandler.func1 (3 handlers)
[GIN-debug] POST   /debug/pprof/symbol       --> github.com/DeanThompson/ginpprof.SymbolHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/trace        --> github.com/DeanThompson/ginpprof.TraceHandler.func1 (3 handlers)
[GIN-debug] GET    /debug/pprof/mutex        --> github.com/DeanThompson/ginpprof.MutexHandler.func1 (3 handlers)
[GIN-debug] Listening and serving HTTP on :8080
```

Now visit [http://127.0.0.1:8080/debug/pprof/](http://127.0.0.1:8080/debug/pprof/) and you'll see what you want.

Have Fun.
