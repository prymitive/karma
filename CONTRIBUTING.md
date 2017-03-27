# Contributing to unsee

## Getting Started

To get started follow `Building from source` section of the `README.md` file.

## Testing changes

To run included tests and check code style with `golint` run:

    make test

## Vendoring dependencies

If you use any new dependency or remove any existing one, please run:

    make vendor

This will install and run [manul](https://github.com/kovetskiy/manul), which
will detect all used package and add/remove git submodule pointers in the
vendor directory.

To update all vendor package run:

    make vendor-update

To update specific vendor package run manul manually:

    manul -Urt <package>

## Running

To build and start `unsee` from local branch see `Running` section of the
`README.md` file.

When working with assets (templates, stylesheets and javascript files) `DEBUG`
flag for make can be set, which will recompile binary assets in debug mode,
meaning that files from disk will be read instead of compiled in assets.
See [go-bindata docs](https://github.com/jteeuwen/go-bindata#debug-vs-release-builds)
for details. Example:

    make DEBUG=true run
