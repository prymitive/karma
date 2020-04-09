FROM node:12.16.1-alpine3.11 as nodejs-builder
RUN mkdir -p /src/ui
COPY ui/package.json ui/package-lock.json /src/ui/
RUN cd /src/ui && npm install
RUN apk add make git
COPY ui /src/ui
RUN make -C /src/ui build

FROM golang:1.14.2-alpine3.11 as go-builder
RUN apk add make git
COPY Makefile /src/Makefile
COPY make /src/make
COPY go.mod /src/go.mod
COPY go.sum /src/go.sum
RUN make -C /src download-deps-go
RUN make -C /src install-deps-build-go
COPY --from=nodejs-builder /src/ui /src/ui
COPY cmd /src/cmd
COPY internal /src/internal
ARG VERSION
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM gcr.io/distroless/base
COPY --from=go-builder /src/karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]
