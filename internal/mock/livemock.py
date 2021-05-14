#!/usr/bin/env python3

import json
import time
from urllib.request import Request, urlopen


def requests_post(url, data):
    print("POST %s" % url)
    req = Request(url)
    req.add_header("Content-Type", "application/json")
    try:
        urlopen(req, json.dumps(data).encode("utf-8"))
    except Exception as e:
        print(e.read().decode())
    print("Done")


requests_post(
    "http://localhost:9093/api/v2/silences",
    {
        "matchers": [{"name": "instance", "value": "web1", "isRegex": False}],
        "startsAt": "2017-02-18T01:34:34Z",
        "endsAt": "2063-01-01T00:00:00Z",
        "createdBy": "john@example.com",
        "comment": "Silenced instance",
    },
)

requests_post(
    "http://localhost:9093/api/v2/silences",
    {
        "matchers": [
            {
                "name": "alertname",
                "value": "Host_Down",
                "isRegex": False,
            },
            {"name": "cluster", "value": "dev", "isRegex": False},
        ],
        "startsAt": "2017-02-18T01:34:34Z",
        "endsAt": "2063-01-01T00:00:00Z",
        "createdBy": "john@example.com",
        "comment": "Silenced Host_Down alerts in the dev cluster",
    },
)

requests_post(
    "http://localhost:9093/api/v2/silences",
    {
        "matchers": [{"name": "instance", "value": "server7", "isRegex": False}],
        "startsAt": "2017-02-18T01:34:34Z",
        "endsAt": "2063-01-01T00:00:00Z",
        "createdBy": "john@example.com",
        "comment": "Silenced server7",
    },
)

for i in range(0, 5):
    requests_post(
        "http://localhost:9093/api/v2/alerts",
        [
            {
                "labels": {
                    "alertname": "HTTP_Probe_Failed",
                    "instance": "web1",
                    "job": "node_exporter",
                    "cluster": "dev",
                },
                "annotations": {
                    "help": "Example help annotation",
                    "summary": "Example summary",
                    "url": "http://localhost/example.html",
                },
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "HTTP_Probe_Failed",
                    "instance": "web2",
                    "job": "node_exporter",
                    "cluster": "dev",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server1",
                    "job": "node_ping",
                    "cluster": "prod",
                    "ip": "127.0.0.1",
                },
                "annotations": {
                    "summary": "Example summary",
                    "url": "http://localhost/example.html",
                },
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server2",
                    "job": "node_ping",
                    "cluster": "prod",
                    "ip": "127.0.0.2",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server3",
                    "job": "node_ping",
                    "cluster": "staging",
                    "ip": "127.0.0.3",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server4",
                    "job": "node_ping",
                    "cluster": "staging",
                    "ip": "127.0.0.4",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server5",
                    "job": "node_ping",
                    "cluster": "staging",
                    "ip": "127.0.0.5",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server6",
                    "job": "node_ping",
                    "cluster": "dev",
                    "ip": "127.0.0.6",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server7",
                    "job": "node_ping",
                    "cluster": "dev",
                    "ip": "127.0.0.7",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Host_Down",
                    "instance": "server8",
                    "job": "node_ping",
                    "cluster": "dev",
                    "ip": "127.0.0.8",
                },
                "annotations": {"summary": "Example summary"},
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Memory_Usage_Too_High",
                    "instance": "server2",
                    "job": "node_exporter",
                    "cluster": "prod",
                },
                "annotations": {
                    "alert": "Memory usage exceeding threshold",
                    "dashboard": "http://localhost/dashboard.html",
                },
                "generatorURL": "http://localhost/prometheus",
            },
            {
                "labels": {
                    "alertname": "Free_Disk_Space_Too_Low",
                    "instance": "server5",
                    "job": "node_exporter",
                    "cluster": "staging",
                    "disk": "sda",
                },
                "annotations": {
                    "alert": "Less than 10% disk space is free",
                    "dashboard": "http://localhost/dashboard.html",
                },
                "generatorURL": "http://localhost/prometheus",
            },
        ],
    )
    time.sleep(10)
