FROM golang:alpine3.5

ADD . /go/src/github.com/cloudflare/unsee

ARG VERSION

RUN go install \
    -ldflags "-X main.version=${VERSION:-dev}" \
    github.com/cloudflare/unsee

RUN rm -fr /go/src

CMD ["unsee"]
