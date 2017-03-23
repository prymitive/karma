FROM golang:1.7.5-alpine3.5

ADD . /go/src/github.com/cloudflare/unsee

ARG VERSION

RUN go install \
    -ldflags "-X main.version=${VERSION:-dev}" \
    github.com/cloudflare/unsee

RUN mv /go/src/github.com/cloudflare/unsee/static \
       /go/src/github.com/cloudflare/unsee/templates \
       /go/ && \
       rm -fr /go/src

CMD ["unsee"]
