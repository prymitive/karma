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

This will install and run [dep](https://github.com/golang/dep), which will
detect all used package and fetch them into the vendor directory.

To update all vendor package run:

    make vendor-update

To update specific vendor package run `dep` manually:

    dep ensure <import-path-filter>

See [dep](https://github.com/golang/dep) documentation for details.

## Javascript & CSS assets and HTML templates

JS and CSS assets are managed via [npm](https://www.npmjs.com/) and compiled
into bundle files using [webpack](https://webpack.js.org/).

To add a new JS asset install it using npm with the `--save` flag, this will
add it to the `package.json`. Now you can `require()` it in javascript code.
JS modules are written using [CommonJS](http://www.commonjs.org/specs/modules/1.0/)
syntax. Webpack will use [babel](https://babeljs.io/) to transform JS code to
[ES2015](https://babeljs.io/docs/plugins/preset-es2015/).

Once assets dir is modified please run:

    make bindata_assetfs.go

This will rebuild [https://github.com/elazarl/go-bindata-assetfs](binary assets)
file. Be sure to include it in the commit.
Same applies to HTML template files, please rebuild bindata_assetfs.go before
commit. Note that Makefile targets are setup to run it automatically if changes
are detected, so it's usually not needed for development.

During development you can set `NODE_ENV=test` before running any make targets,
this will prevent webpack from using expensive optimizations only needed when
generating production assets.

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
  `internal/alertmanager/mapper.go` file.
