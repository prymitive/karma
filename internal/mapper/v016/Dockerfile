FROM quay.io/goswagger/swagger:v0.19.0

RUN apk add --update curl

COPY run.sh /run.sh

ENTRYPOINT ["/run.sh"]
