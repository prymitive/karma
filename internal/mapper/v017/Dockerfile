FROM quay.io/goswagger/swagger:0.20.0

RUN apk add --update curl

COPY run.sh /run.sh

ENTRYPOINT ["/run.sh"]
