FROM node:8.12.0-alpine as nodejs-builder
RUN apk add --update make git
COPY . /karma
RUN make -C /karma ui

FROM golang:1.11.0-alpine as go-builder
COPY --from=nodejs-builder /karma /go/src/github.com/prymitive/karma
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /go/src/github.com/prymitive/karma VERSION="${VERSION:-dev}" karma

FROM alpine:latest
RUN apk add --update supervisor python && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/supervisord.conf /etc/supervisord.conf
COPY --from=prom/alertmanager:latest /bin/alertmanager /alertmanager
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY --from=go-builder /go/src/github.com/prymitive/karma/karma /karma
COPY demo/karma.yaml /etc/karma.yaml
RUN adduser -D karma
USER karma
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
