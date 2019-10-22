FROM node:12.13.0-alpine as nodejs-builder
RUN apk update && apk upgrade && apk add --update make git
COPY Makefile /src/Makefile
COPY ui /src/ui
RUN make -C /src ui

FROM golang:1.13.3-alpine as go-builder
RUN apk update && apk upgrade && apk add --update make git
COPY Makefile /src/Makefile
COPY go.mod /src/go.mod
COPY go.sum /src/go.sum
RUN make -C /src download-deps
COPY --from=nodejs-builder /src/ui /src/ui
COPY --from=nodejs-builder /src/.build /src/.build
COPY cmd /src/cmd
COPY internal /src/internal
ARG VERSION
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM alpine:3.10
RUN apk update && apk upgrade && apk add --update supervisor python && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/supervisord.conf /etc/supervisord.conf
COPY --from=prom/alertmanager:v0.19.0 /bin/alertmanager /alertmanager
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY --from=go-builder /src/karma /karma
COPY demo/karma.yaml /etc/karma.yaml
COPY demo/custom.js /custom.js
RUN adduser -D karma
USER karma
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
