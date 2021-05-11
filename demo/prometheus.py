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
            value = random.randint(0, 10)
        series.append([now, str(value)])
        now = now - 3600
    return series


def maybe_fail():
    if random.randint(0, 100) > 98:
        return True
    return False


class server(BaseHTTPRequestHandler):
    def _set_headers(self, code=200):
        self.send_response(code)
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
        if maybe_fail():
            self._set_headers(code=500)
            self.wfile.write(json.dumps({"status": "error"}).encode("utf-8"))
            return
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
