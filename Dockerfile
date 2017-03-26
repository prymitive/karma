FROM golang:1.8.0-alpine

ADD . /go/src/github.com/cloudflare/unsee

ARG VERSION

RUN go install \
    -ldflags "-X main.version=${VERSION:-dev}" \
    github.com/cloudflare/unsee && \
    rm -fr /go/src

CMD ["unsee"]
