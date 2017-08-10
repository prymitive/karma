FROM golang:1.8.3-alpine

COPY . /go/src/github.com/cloudflare/unsee

ARG VERSION

RUN apk add --update --no-cache --virtual .build-dependencies \
        make git nodejs && \
    make -C /go/src/github.com/cloudflare/unsee VERSION="${VERSION:-dev}" && \
    mv /go/src/github.com/cloudflare/unsee/unsee /bin/unsee && \
    rm -fr /go/src && \
    apk del .build-dependencies

EXPOSE 8080

CMD ["unsee"]
