FROM golang:1.9.1-alpine3.6 as unsee-builder
COPY . /go/src/github.com/cloudflare/unsee

ARG VERSION
RUN apk add --update make git nodejs nodejs-npm
RUN CGO_ENABLED=0 make -C /go/src/github.com/cloudflare/unsee VERSION="${VERSION:-dev}" unsee

FROM gcr.io/distroless/base
COPY --from=unsee-builder /go/src/github.com/cloudflare/unsee/unsee /unsee
EXPOSE 8080
CMD ["/unsee"]
