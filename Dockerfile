FROM node:10.16.3-alpine as nodejs-builder
RUN apk add --update make git
COPY . /src
RUN make -C /src ui

FROM golang:1.13.1-alpine as go-builder
COPY --from=nodejs-builder /src /src
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /src VERSION="${VERSION:-dev}" karma

FROM gcr.io/distroless/base
COPY ./docs/dark.css /themes/dark.css
COPY --from=go-builder /src/karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]
