FROM node:8-alpine as nodejs-builder
RUN apk add --update make git
COPY . /unsee
RUN make -C /unsee webpack

FROM golang:1.10.1-alpine as go-builder
COPY --from=nodejs-builder /unsee /go/src/github.com/cloudflare/unsee
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /go/src/github.com/cloudflare/unsee VERSION="${VERSION:-dev}" unsee

FROM gcr.io/distroless/base
COPY --from=go-builder /go/src/github.com/cloudflare/unsee/unsee /unsee
EXPOSE 8080
CMD ["/unsee"]
