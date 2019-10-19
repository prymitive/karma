FROM quay.io/goswagger/swagger:v0.21.0

RUN apk update && apk upgrade && apk add --update curl

COPY run.sh /run.sh

ENTRYPOINT ["/run.sh"]
