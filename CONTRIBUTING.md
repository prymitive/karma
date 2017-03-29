# Contributing to unsee

## Getting Started

To get started follow `Building from source` section of the [README](README.md)
file.

## Testing changes

To run included tests and check code style with `golint` run:

    make test

## Vendoring dependencies

If you use any new dependency or remove any existing one, please run:

    make vendor

This will install and run [govendor](https://github.com/kardianos/govendor),
which will detect all used package and fetch them into the vendor directory.

To update all vendor package run:

    make vendor-update

To update specific vendor package run `govendor` manually:

    govendor update <import-path-filter>

See [govendor](https://github.com/kardianos/govendor) documentation for details.

## Running

To build and start `unsee` from local branch see `Running` section of the
[README](README.md) file.

When working with assets (templates, stylesheets and javascript files) `DEBUG`
make variable can be set, which will recompile binary assets in debug mode,
meaning that files from disk will be read instead of compiled in assets.
See [go-bindata docs](https://github.com/jteeuwen/go-bindata#debug-vs-release-builds)
for details. Example:

    make DEBUG=true run
    make DEBUG=true run-docker

Note that this is not the same as enabling [debug mode](/README.md#debug) for
the [gin web framework](https://github.com/gin-gonic/gin) which is used
internally, but enabling `DEBUG` via this make variable will also enable gin
debug mode.
When running docker image via `make run-docker` with `DEBUG` make variable set
to `true` volume mapping will be added (in read-only mode), so that unsee
instance running inside the docker can read asset files from the sources
directory.
