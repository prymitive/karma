FROM golang:1.8.3-alpine as unsee-builder
COPY . /go/src/github.com/cloudflare/unsee
ARG VERSION
RUN apk add --update make git nodejs
RUN make -C /go/src/github.com/cloudflare/unsee VERSION="${VERSION:-dev}"

FROM golang:1.8.3-alpine
COPY --from=unsee-builder /go/src/github.com/cloudflare/unsee/unsee /bin/unsee
EXPOSE 8080
CMD ["unsee"]
