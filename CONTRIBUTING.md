# Contributing to karma

## Getting Started

To get started follow `Building from source` section of the [README](README.md)
file.

## Git tags and branches

Every release tag name will follow `vX.Y.Z` naming scheme, example: `v0.1.0`.
All releases are tagged against the `main` branch.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org) format is required
for all commits.

## Testing changes

To run included tests and linters run:

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

Some UI tests are using [snapshots](https://jestjs.io/docs/en/snapshot-testing).
After making changes that affect how existing components are rendered please
run:

    cd ui && npm test -- -u

to update all snapshots. Remember to commit those changes when making a pull
request.

## Running

To build and start `karma` from local branch see `Running` section of the
[README](README.md) file.
