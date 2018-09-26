FROM node:8.12.0-alpine as nodejs-builder
RUN apk add --update make git
COPY . /karma
RUN make -C /karma ui

FROM golang:1.11.0-alpine as go-builder
COPY --from=nodejs-builder /karma /go/src/github.com/prymitive/karma
ARG VERSION
RUN apk add --update make git
RUN CGO_ENABLED=0 make -C /go/src/github.com/prymitive/karma VERSION="${VERSION:-dev}" karma

FROM gcr.io/distroless/base
COPY --from=go-builder /go/src/github.com/prymitive/karma/karma /karma
EXPOSE 8080
ENTRYPOINT ["/karma"]
