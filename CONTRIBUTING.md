# Contributing to karma

## Getting Started

To get started follow `Building from source` section of the [README](README.md)
file.

## Git tags and branches

Every release tag name will follow `vX.Y.Z` naming scheme, example: `v0.1.0`.
Every release tree has a dedicated branch named `release-X.Y`, example:
`release-0.1`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org) format is required
for all commits.

## Testing changes

To run included tests and check code style with `golint` run:

    make test

## Vendoring dependencies

[Go modules](https://github.com/golang/go/wiki/Modules) are used for managing
dependecies. After adding new or removing exitsting depenencies please run

    go mod tidy

to update `go.mod` and `go.sum` files.

## Javascript & CSS assets

UI is written using [React](https://reactjs.org), follow user guide for
[create-react-app](https://github.com/facebook/create-react-app) to make
changes to the UI code.

## Running

To build and start `karma` from local branch see `Running` section of the
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
to `true` volume mapping will be added (in read-only mode), so that karma
instance running inside the docker can read asset files from the sources
directory.

## Adding support for new Alertmanager release

To support a new release that breaks API following changes needs to be done:

- Verify that `GetVersion()` function can still correctly read remote
  Alertmanager version via `/api/v1/status` endpoint, adapt it if needed.
- Create a new mapper package implementing unmarshaling of alerts and/or
  silences (depending if both need a new code) under mapper/vXY (X major
  Alertmanager version, Y minor version).
- Register new mapper in the `init()` function in the
  `internal/alertmanager/mapper.go` file.
