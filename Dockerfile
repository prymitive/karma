FROM node:10.14.2-alpine as nodejs-builder
RUN apk add --update make git
COPY . /karma
RUN make -C /karma ui

FROM golang:1.11.4-alpine as go-builder
COPY --from=nodejs-builder /karma /go/src/github.com/prymitive/karma
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /go/src/github.com/prymitive/karma VERSION="${VERSION:-dev}" karma

# Compress Caddy with UPX
#
FROM debian:stable as compress

# curl, tar
RUN apt-get update && apt install -y --no-install-recommends \
    tar \
    xz-utils \
    curl \
    ca-certificates

# get official upx binary
RUN curl --silent --show-error --fail --location -o - \
    "https://github.com/upx/upx/releases/download/v3.95/upx-3.95-amd64_linux.tar.xz" \
    | tar --no-same-owner -C /usr/bin/ -xJ \
    --strip-components 1 upx-3.95-amd64_linux/upx

# copy and compress
COPY --from=go-builder /go/src/github.com/prymitive/karma/karma /karma
RUN /usr/bin/upx --ultra-brute /karma

FROM gcr.io/distroless/base
COPY --from=compress /karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]

