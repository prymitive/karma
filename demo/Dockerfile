FROM node:10.15.2-alpine as nodejs-builder
RUN apk add --update make git
COPY . /src
RUN make -C /src ui

FROM golang:1.12.0-alpine as go-builder
COPY --from=nodejs-builder /src /src
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM alpine:3.9
RUN apk add --update supervisor python && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/supervisord.conf /etc/supervisord.conf
COPY --from=prom/alertmanager:v0.15.3 /bin/alertmanager /alertmanager
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY --from=go-builder /src/karma /karma
COPY demo/karma.yaml /etc/karma.yaml
COPY demo/custom.js /custom.js
RUN adduser -D karma
USER karma
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
