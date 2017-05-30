#!/usr/bin/env python

import time
import requests

requests.post('http://localhost:9093/api/v1/silences',
    json={
      "matchers": [
        {
          "name": "instance",
          "value": "web1",
          "isRegex": False
        }
      ],
      "startsAt": "2017-02-18T01:34:34Z",
      "endsAt": "2063-01-01T00:00:00Z",
      "createdBy": "john@example.com",
      "comment": "Silenced instance"
    })

requests.post('http://localhost:9093/api/v1/silences',
    json={
      "matchers": [
        {
          "name": "alertname",
          "value": "Host_Down",
          "isRegex": False
        },
        {
          "name": "cluster",
          "value": "dev",
          "isRegex": False
        }
      ],
      "startsAt": "2017-02-18T01:34:34Z",
      "endsAt": "2063-01-01T00:00:00Z",
      "createdBy": "john@example.com",
      "comment": "Silenced Host_Down alerts in the dev cluster"
    })

for i in xrange(0, 5):
    requests.post('http://localhost:9093/api/v1/alerts',
        json=[{
            "labels": {
                "alertname": "HTTP_Probe_Failed",
                "instance": "web1",
                "job": "node_exporter",
                "cluster": "dev"
            },
            "annotations": {
                "help": "Example help annotation",
                "summary": "Example summary",
                "url": "http://localhost/example.html"
            }
        }, {
            "labels": {
                "alertname": "HTTP_Probe_Failed",
                "instance": "web2",
                "job": "node_exporter",
                "cluster": "dev"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server1",
                "job": "node_ping",
                "cluster": "prod"
            },
            "annotations": {
                "summary": "Example summary",
                "url": "http://localhost/example.html"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server2",
                "job": "node_ping",
                "cluster": "prod"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server3",
                "job": "node_ping",
                "cluster": "staging"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server4",
                "job": "node_ping",
                "cluster": "staging"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server5",
                "job": "node_ping",
                "cluster": "staging"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server6",
                "job": "node_ping",
                "cluster": "dev"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server7",
                "job": "node_ping",
                "cluster": "dev"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Host_Down",
                "instance": "server8",
                "job": "node_ping",
                "cluster": "dev"
            },
            "annotations": {
                "summary": "Example summary"
            }
        }, {
            "labels": {
                "alertname": "Memory_Usage_Too_High",
                "instance": "server2",
                "job": "node_exporter",
                "cluster": "prod"
            },
            "annotations": {
                "alert": "Memory usage exceeding threshold",
                "dashboard": "http://localhost/dashboard.html"
            }
        }, {
            "labels": {
                "alertname": "Free_Disk_Space_Too_Low",
                "instance": "server5",
                "job": "node_exporter",
                "cluster": "staging"
            },
            "annotations": {
                "alert": "Less than 10% disk space is free",
                "dashboard": "http://localhost/dashboard.html"
            }
        }]
    )
    time.sleep(10)
