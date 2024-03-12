FROM node:21.7.1-alpine as nodejs-builder
RUN mkdir -p /src/ui
RUN apk add make git
COPY ui/package.json ui/package-lock.json /src/ui/
RUN cd /src/ui && npm ci && touch node_modules/.install
COPY ui /src/ui
RUN make -C /src/ui build

FROM golang:1.22.1-alpine as go-builder
RUN apk add make git
COPY Makefile /src/Makefile
COPY make /src/make
COPY go.mod /src/go.mod
COPY go.sum /src/go.sum
RUN make -C /src download-deps-go
COPY --from=nodejs-builder /src/ui/embed.go /src/ui/embed.go
COPY --from=nodejs-builder /src/ui/mock /src/ui/mock
COPY --from=nodejs-builder /src/ui/src /src/ui/src
COPY --from=nodejs-builder /src/ui/dist /src/ui/dist
COPY cmd /src/cmd
COPY internal /src/internal
ARG VERSION
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM ghcr.io/prymitive/kthxbye:v0.16 as kthxbye

FROM prom/alertmanager:v0.27.0 as alertmanager

FROM alpine:3.19
COPY --from=kthxbye /kthxbye /kthxbye
COPY --from=alertmanager /bin/alertmanager /alertmanager
RUN apk add supervisor python3 && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/run.sh /run.sh
COPY demo/supervisord.conf /etc/supervisord.conf
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY demo/prometheus.py /prometheus.py
COPY demo/karma.yaml /etc/karma.yaml
COPY demo/acls.yaml /etc/acls.yaml
RUN adduser -D karma
COPY --from=go-builder /src/karma /karma
USER karma
ENV GOGC=50
EXPOSE 8080
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
