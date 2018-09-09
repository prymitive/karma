#!/usr/bin/env python
"""
Generates alerts and sends to Alertmanager API.

1. Start Alertmanager:

$ docker run \
    --rm \
    --name prom \
    -p 9093:9093 \
    -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
    prom/alertmanager

2. Start this script
3. Start karma:

$ karma \
    --alertmanager.uri http://localhost:9093 \
    --alertmanager.interval 10s \
    --annotations.hidden help \
    --labels.color.unique "@receiver instance cluster" \
    --labels.color.static job \
    --filters.default "@receiver=by-cluster-service"
"""


import random
import json
import time
import urllib2


API = "http://localhost:9093"


def jsonPostRequest(uri, data):
    req = urllib2.Request(uri)
    req.add_header("Content-Type", "application/json")
    response = urllib2.urlopen(req, json.dumps(data))


def addSilence(matchers, startsAt, endsAt, createdBy, comment):
    jsonPostRequest("{}/api/v1/silences".format(API), {
        "matchers": matchers,
        "startsAt": startsAt,
        "endsAt": endsAt,
        "createdBy": createdBy,
        "comment": comment
    })


def addAlerts(alerts):
    jsonPostRequest("{}/api/v1/alerts".format(API), alerts)


def newMatcher(name, value, isRegex):
    return {"name": name, "value": value, "isRegex": isRegex}


def newAlert(labels, annotations=None, generatorURL="http://localhost:9093"):
    return {
        "labels": labels,
        "annotations": annotations or {},
        "generatorURL": generatorURL
    }


class AlertGenerator(object):
    name = "Fake Alert"

    def __init__(self, interval=15):
        self._interval = interval
        self._lastSend = 1

    def _labels(self, **kwargs):
        labels = {"alertname": self.name}
        labels.update(kwargs)
        return labels

    def _send(self):
        alerts = self.generate()
        if alerts:
            print("{} sending {} alert(s)".format(self.name, len(alerts)))
            addAlerts(alerts)

    def tick(self):
        if time.time() - self._lastSend >= self._interval:
            self._send()
            self._lastSend = time.time()


class AlwaysOnAlert(AlertGenerator):
    name = "Always On Alert"

    def generate(self):
        return [
            newAlert(
                self._labels(instance="server{}".format(i))
            ) for i in xrange(0, 10)
        ]


class RandomInstances(AlertGenerator):
    name = "Random Instances"

    def generate(self):
        instances = random.randint(0, 30)
        return [
            newAlert(
                self._labels(instance="server{}".format(i))
            ) for i in xrange(0, instances)
        ]


class LowChance(AlertGenerator):
    name = "Low Chance"

    def generate(self):
        throw = random.randint(0, 100)
        if throw > 10:
            return []
        return [
            newAlert(
                self._labels(instance="server{}".format(i))
            ) for i in xrange(0, 3)
        ]


class TimeAnnotation(AlertGenerator):
    name = "Time Annotation"

    def generate(self):
        annotations = {"time": str(int(time.time()))}
        return [
            newAlert(self._labels(instance="server1"), annotations)
        ]


if __name__ == "__main__":
    generators = [
        AlwaysOnAlert(15),
        RandomInstances(30),
        LowChance(60),
        TimeAnnotation(5),
    ]
    while True:
        for g in generators:
            g.tick()
        time.sleep(1)
