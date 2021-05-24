FROM node:14.17.0-alpine as nodejs-builder
RUN mkdir -p /src/ui
COPY ui/package.json ui/package-lock.json /src/ui/
RUN cd /src/ui && npm ci && touch node_modules/.install
RUN apk add make git
COPY ui /src/ui
RUN make -C /src/ui build

FROM golang:1.16.4-alpine as go-builder
RUN apk add make git
COPY Makefile /src/Makefile
COPY make /src/make
COPY go.mod /src/go.mod
COPY go.sum /src/go.sum
RUN make -C /src download-deps-go
COPY --from=nodejs-builder /src/ui/src /src/ui/src
COPY --from=nodejs-builder /src/ui/build /src/ui/build
COPY --from=nodejs-builder /src/ui/embed.go /src/ui/embed.go
COPY cmd /src/cmd
COPY internal /src/internal
ARG VERSION
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM alpine:3.13
COPY --from=ghcr.io/prymitive/kthxbye:v0.11 /kthxbye /kthxbye
COPY --from=prom/alertmanager:v0.22.0 /bin/alertmanager /alertmanager
RUN apk add supervisor python3 && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/supervisord.conf /etc/supervisord.conf
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY demo/prometheus.py /prometheus.py
COPY --from=go-builder /src/karma /karma
COPY demo/karma.yaml /etc/karma.yaml
COPY demo/acls.yaml /etc/acls.yaml
RUN adduser -D karma
USER karma
ENV GOGC=50
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
