#!/bin/sh -e

AM_VERSION=$1
API_VERSION=$2
TARGET_DIR=$3
API_YAML_URL=https://raw.githubusercontent.com/prometheus/alertmanager/${AM_VERSION}/api/${API_VERSION}/openapi.yaml

curl -sL -o /tmp/openapi.yaml ${API_YAML_URL}

swagger generate client -f /tmp/openapi.yaml --target ${TARGET_DIR}
