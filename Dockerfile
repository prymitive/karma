FROM node:12.18.2-alpine as nodejs-builder
RUN mkdir -p /src/ui
COPY ui/package.json ui/package-lock.json /src/ui/
ENV NODE_ENV=production
RUN cd /src/ui && npm install
RUN apk add make git
COPY ui /src/ui
RUN make -C /src/ui build

FROM golang:1.14.4-alpine as go-builder
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

FROM gcr.io/distroless/base
COPY --from=go-builder /src/karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]
