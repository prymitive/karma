#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Mock Prometheus server for alery history queries
"""


import json
import sys
import random
import time
from http.server import BaseHTTPRequestHandler, HTTPServer


def generateSeries():
    series = []
    now = time.time()
    for i in range(24):
        value = 0
        if random.randint(0, 100) > 75:
            value = random.randint(0, 100)
        series.append([now, str(value)])
        now = now - 3600
    return series


class server(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

    def _query_range(self):
        self.wfile.write(
            json.dumps(
                {
                    "status": "success",
                    "data": {
                        "resultType": "matrix",
                        "result": [
                            {
                                "metric": {},
                                "values": generateSeries(),
                            }
                        ],
                    },
                }
            ).encode("utf-8")
        )

    def _label_names(self):
        self.wfile.write(
            json.dumps(
                {
                    "status": "success",
                    "data": [
                        "alertname",
                        "instance",
                        "cluster",
                        "region",
                        "job",
                        "severity",
                        "device",
                    ],
                }
            ).encode("utf-8")
        )

    def do_POST(self):
        self.do_GET()

    def do_GET(self):
        self._set_headers()
        if self.path.startswith("/api/v1/labels"):
            self._label_names()
        else:
            self._query_range()


if __name__ == "__main__":
    server_address = ("", int(sys.argv[1]))
    httpd = HTTPServer(server_address, server)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
