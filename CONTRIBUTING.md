# Contributing to unsee

## Getting Started

To get started follow `Building from source` section of the [README](README.md)
file.

## Git tags and branches

Every release tag name will follow `vX.Y.Z` naming scheme, example: `v0.1.0`.
Every release tree has a dedicated branch named `release-X.Y`, example:
`release-0.1`.

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

## Javascript & CSS assets

JS and CSS assets are also vendored into `assets/static` directory.
There is a make target that allows to fetch all needed files from the
[cdnjs](https://cdnjs.com/) site. If you need to add a new JS or CSS file then
add it to the `assets/Makefile` in the `assets` target and run:

    make -C assets assets

If the assets you're adding are not found on cdnjs then download it and place
inside `assets/static` directory. In this case you will also need to manually
include it in the `templates/js.html` template file (managed assets are all
included automatically).

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

## Adding support for new Alertmanager release

To support a new release that breaks API following changes needs to be done:

* Verify that `GetVersion()` function can still correctly read remote
  Alertmanager version via `/api/v1/status` endpoint, adapt it if needed.
* Create a new mapper package implementing unmarshaling of alerts and/or
  silences (depending if both need a new code) under mapper/vXY (X major
  Alertmanager version, Y minor version).
* Register new mapper in the `init()` function in the
  `alertmanager/alertmanager.go` file.
