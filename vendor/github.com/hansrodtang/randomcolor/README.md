RandomColor.go
==============

[![Documentation](http://img.shields.io/badge/documentation-GoDoc-blue.svg?style=flat)](http://godoc.org/github.com/hansrodtang/randomcolor)

Random color generator for Go based on David Merfields [randomColor.js](http://llllll.li/randomColor/)

```go
rand.Seed(time.Now().UnixNano()) // Seed the random number generator
color := randomcolor.New(randomcolor.Purple, randomcolor.LIGHT) // Generate a random light purple color
```

It is, as the original source, licensed under CC0 1.0 Universal.

A fallback of BSD-2 is also available if use of CC0 is not possible.
