FROM node:14.15.4-alpine as nodejs-builder
RUN mkdir -p /src/ui
COPY ui/package.json ui/package-lock.json /src/ui/
ENV NODE_ENV=production
RUN cd /src/ui && npm ci && touch node_modules/.install
RUN apk add make git
COPY ui /src/ui
RUN make -C /src/ui build

FROM golang:1.15.6-alpine as go-builder
RUN apk add make git
COPY Makefile /src/Makefile
COPY make /src/make
COPY go.mod /src/go.mod
COPY go.sum /src/go.sum
RUN make -C /src download-deps-go
COPY tools/go-bindata /src/tools/go-bindata
RUN make -C /src install-deps-build-go
COPY --from=nodejs-builder /src/ui/src /src/ui/src
COPY --from=nodejs-builder /src/ui/build /src/ui/build
COPY cmd /src/cmd
COPY internal /src/internal
ARG VERSION
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM alpine:3.13
COPY --from=ghcr.io/prymitive/kthxbye:v0.10 /kthxbye /kthxbye
COPY --from=prom/alertmanager:v0.21.0 /bin/alertmanager /alertmanager
RUN apk add supervisor python3 && rm  -rf /tmp/* /var/cache/apk/*
COPY demo/supervisord.conf /etc/supervisord.conf
COPY demo/alertmanager.yaml /etc/alertmanager.yaml
COPY demo/generator.py /generator.py
COPY --from=go-builder /src/karma /karma
COPY demo/karma.yaml /etc/karma.yaml
COPY demo/acls.yaml /etc/acls.yaml
RUN adduser -D karma
USER karma
ENV GOGC=50
CMD supervisord --nodaemon --configuration /etc/supervisord.conf
