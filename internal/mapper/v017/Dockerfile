FROM quay.io/goswagger/swagger:v0.20.1

RUN apk update && apk upgrade && apk add --update curl

COPY run.sh /run.sh

ENTRYPOINT ["/run.sh"]
