FROM golang:1.8.3-alpine

COPY . /go/src/github.com/cloudflare/unsee

ARG VERSION

RUN go install \
    -ldflags "-X main.version=${VERSION:-dev}" \
    github.com/cloudflare/unsee && \
    rm -fr /go/src

EXPOSE 8080

CMD ["unsee"]
