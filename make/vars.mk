NAME    := karma
VERSION ?= $(shell git describe --tags --always --dirty='-dev')

# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

SOURCES_GO = $(call rwildcard, cmd internal, *)
SOURCES_JS = $(call rwildcard, ui/build/index.html ui/src, *)
