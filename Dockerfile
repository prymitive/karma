FROM node:10.16.3-alpine as nodejs-builder
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

FROM gcr.io/distroless/base
COPY ./docs/dark.css /themes/dark.css
COPY --from=go-builder /src/karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]
