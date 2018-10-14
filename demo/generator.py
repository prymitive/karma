#!/usr/bin/env python
"""
Generates alerts and sends to Alertmanager API.

1. Start Alertmanager:

$ docker run \
    --rm \
    --name prom \
    -p 9093:9093 \
    -v $(pwd)/alertmanager.yaml:/etc/alertmanager/alertmanager.yml \
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
import datetime
import time
import urllib2


API = "http://localhost:9093"
MAX_INTERVAL = 10
MIN_INTERVAL = 5


def jsonGetRequest(uri):
    req = urllib2.Request(uri)
    response = urllib2.urlopen(req)
    return json.load(response)

def jsonPostRequest(uri, data):
    req = urllib2.Request(uri)
    req.add_header("Content-Type", "application/json")
    response = urllib2.urlopen(req, json.dumps(data))


def addSilence(matchers, startsAt, endsAt, createdBy, comment):
    uri = "{}/api/v1/silences".format(API)

    silences = jsonGetRequest(uri)
    found = False
    for silence in silences["data"]:
        if silence["status"]["state"] != "active":
            continue
        if silence["createdBy"] == createdBy and silence["comment"] == comment:
            if json.dumps(silence["matchers"], sort_keys=True) == json.dumps(
                    matchers, sort_keys=True):
                found = True
                break

    if not found:
        jsonPostRequest(uri, {
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
    comment = ""

    def __init__(self, interval=15):
        self._interval = interval
        self._lastSend = 1

    def _annotations(self, **kwargs):
        annotations = {"help": self.comment}
        annotations.update(kwargs)
        return annotations

    def _labels(self, **kwargs):
        labels = {"alertname": self.name}
        labels.update(kwargs)
        return labels

    def _send(self):
        alerts = self.alerts()
        if alerts:
            addAlerts(alerts)

        for silence in self.silences():
            addSilence(*silence)

    def alerts(self):
        return []

    def silences(self):
        return []

    def tick(self):
        if time.time() - self._lastSend >= self._interval:
            self._send()
            self._lastSend = time.time()


class AlwaysOnAlert(AlertGenerator):
    name = "Always On Alert"
    comment = "This alert is always firing"

    def alerts(self):
        def _gen(size, cluster):
            return [newAlert(
                self._labels(instance="server{}".format(i), cluster=cluster),
                self._annotations(
                    summary="Silence this alert, it's always firing")
            ) for i in xrange(1, size)]
        return _gen(10, "dev") + _gen(5, "staging") + _gen(3, "prod")


class RandomInstances(AlertGenerator):
    name = "Random Instances"
    comment = "This alerts will have a random number of instances"

    def alerts(self):
        instances = random.randint(0, 30)
        return [
            newAlert(
                self._labels(instance="server{}".format(i), cluster="staging"),
                self._annotations(
                    dashboard="https://www.google.com/search?q="
                              "server{}".format(i))
            ) for i in xrange(0, instances)
        ]


class RandomName(AlertGenerator):
    name = "Random Alert Name"
    comment = "This alerts will have a random name"

    def alerts(self):
        alerts = []
        for i in xrange(0, 1):
            throw = random.randint(0, 1000)
            alerts.append(
                newAlert(
                    self._labels(alertname="Alert Nr {}".format(throw),
                                 instance="server{}".format(i),
                                 cluster="dev"),
                    self._annotations(
                        summary="This is a random alert",
                        dashboard="https://www.google.com/search?q="
                                  "server{}".format(i))
                )
            )
        return alerts


class LowChance(AlertGenerator):
    name = "Low Chance"
    comment = "This alert has only a 20% chance of firing"

    def alerts(self):
        throw = random.randint(0, 100)
        if throw > 20:
            return []
        return [
            newAlert(
                self._labels(instance="server{}".format(i), cluster="dev"),
                self._annotations()
            ) for i in xrange(0, 3)
        ]


class TimeAnnotation(AlertGenerator):
    name = "Time Annotation"
    comment = "This alert includes a 'time' annotation that changes every N \
              seconds"

    def alerts(self):
        return [
            newAlert(self._labels(instance="server1", cluster="prod"),
                     self._annotations(time=str(int(time.time())))
            )
        ]


class DiskFreeLowAlert(AlertGenerator):
    name = "Disk Free Low"
    comment = "This alert simulates a warning about low disk space"

    def alerts(self):
        alerts = []
        for i in xrange(0, 10):
            spaceFree = throw = random.randint(0, 10)
            alerts.append(
                newAlert(self._labels(instance="server{}".format(i),
                                      cluster="prod",
                                      device="/dev/sda{}".format(i),
                                      mount_point="/disk"),
                         self._annotations(
                            summary="Only {}% free space left on /disk".format(
                                spaceFree),
                            dashboard="https://wikipedia.org/wiki/Disk_storage")
                )
            )
        return alerts


class SilencedAlert(AlertGenerator):
    name = "Always Silenced Alert"
    comment = "This alert is always silenced"

    def alerts(self):
        return [
            newAlert(self._labels(instance="server1", cluster="prod"),
                     self._annotations(
                        alertReference="https://www."
                                       "youtube.com/watch?v=dQw4w9WgXcQ")
            )
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [newMatcher("alertname", SilencedAlert.name, False)],
                "{}Z".format(now.isoformat()),
                "{}Z".format((now + datetime.timedelta(
                    minutes=30)).isoformat()),
                "me@example.com",
                "Silence '{}''".format(self.name)
            )
        ]


class MixedAlerts(AlertGenerator):
    name = "Mixed Alerts"
    comment = "Some alerts are silenced, some are not"

    def alerts(self):
        return [
            newAlert(self._labels(instance="server{}".format(i), cluster="prod"),
                     self._annotations(
                        alertReference="https://www."
                                       "youtube.com/watch?v=dQw4w9WgXcQ")
            ) for i in xrange(1, 9)
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [newMatcher("alertname", MixedAlerts.name, False),
                 newMatcher("instance", "server(1|3|5|7)", True)],
                "{}Z".format(now.isoformat()),
                "{}Z".format((now + datetime.timedelta(
                    minutes=20)).isoformat()),
                "me@example.com",
                "Silence '{}''".format(self.name)
            )
        ]


class LongNameAlerts(AlertGenerator):
    name = ("Some Alerts With A Ridiculously Long Name To Test Label Truncation"
           " In All The Places We Render Those Alerts")
    comment = "This alert uses long strings to test the UI"

    def alerts(self):
        def _gen(size, cluster):
            return [newAlert(
                self._labels(instance="server{}".format(i), cluster=cluster),
                self._annotations(
                    verylong="Lorem ipsum dolor sit amet, consectetur "
                             "adipiscing elit, sed do eiusmod tempor incididunt"
                             " ut labore et dolore magna aliqua. Ut enim ad "
                             "minim veniam, quis nostrud exercitation ullamco "
                             "laboris nisi ut aliquip ex ea commodo consequat. "
                             "Duis aute irure dolor in reprehenderit in "
                             "voluptate velit esse cillum dolore eu fugiat "
                             "nulla pariatur. Excepteur sint occaecat cupidatat"
                             " non proident, sunt in culpa qui officia deserunt"
                             " mollit anim id est laborum")
            ) for i in xrange(1, size)]
        return _gen(5, "dev") + _gen(1, "staging") + _gen(11, "prod")


if __name__ == "__main__":
    generators = [
        AlwaysOnAlert(MAX_INTERVAL),
        RandomInstances(MAX_INTERVAL),
        LowChance(MAX_INTERVAL),
        TimeAnnotation(MIN_INTERVAL),
        DiskFreeLowAlert(MIN_INTERVAL),
        SilencedAlert(MAX_INTERVAL),
        RandomName(MAX_INTERVAL),
        MixedAlerts(MIN_INTERVAL),
        LongNameAlerts(MAX_INTERVAL),
    ]
    while True:
        for g in generators:
            g.tick()
        time.sleep(1)
