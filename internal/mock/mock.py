#!/usr/bin/env python


import random
import time


def send_alert(annotations, labels):
    data = {
        "annotations": annotations,
        "labels": data,
        "generatorURL": "http://localhost:9093"
    }
    req = urllib2.Request('http://localhost:9093/api/v1/alerts')
    req.add_header('Content-Type', 'application/json')
    response = urllib2.urlopen(req, json.dumps(data))
    print(response)


class FlappingAlert(object):

    annotations = {}
    labels = {}

    def __init__(self, active_for, idle_for, splay):
        self._active_for = active_for
        self._idle_for = idle_for
        self._max_splay = splay

        self.active = True
        self.last_change = time.time()
        self.splay = self.random_splay()

    def random_splay(self):
        return random.randrange(0, self._max_splay)

    def tick():
        if time.time() >= self.last_change + self.splay:
            self.active = !self.active
            self.last_change = time.time()
            self.splay = self.random_splay()

        if self.active:
            send_alert(self.annotations, self.labels)


def main():
    alerts = [

    ]
