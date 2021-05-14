#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Generates alerts and sends to Alertmanager API.

1. Start Alertmanager:

$ docker run \
    --rm \
    --name prom \
    -p 9093:9093 \
    -v $(pwd)/alertmanager.yaml:/etc/alertmanager/alertmanager.yml \
    prom/alertmanager

2. Start this script:

$ ./generator.py

3. Start karma:

$ karma \
    --alertmanager.uri http://localhost:9093 \
    --alertmanager.interval 10s \
    --annotations.hidden help \
    --labels.color.unique "@receiver instance cluster" \
    --labels.color.static job \
    --filters.default "@receiver=by-cluster-service"
"""


import datetime
import json
import random
import time
import urllib.request, urllib.error, urllib.parse


APIs = ["http://localhost:9093", "http://localhost:9094", "http://localhost:9095"]
MAX_INTERVAL = 10
MIN_INTERVAL = 5


def jsonGetRequest(uri):
    req = urllib.request.Request(uri)
    response = urllib.request.urlopen(req)
    return json.load(response)


def jsonPostRequest(uri, data):
    req = urllib.request.Request(uri)
    req.add_header("Content-Type", "application/json")
    try:
        response = urllib.request.urlopen(req, json.dumps(data).encode("utf8"))
    except Exception as e:
        print("Request to '%s' failed: %s" % (uri, e))


def addSilence(matchers, startsAt, endsAt, createdBy, comment):
    uri = "{}/api/v2/silences".format(APIs[0])

    silences = jsonGetRequest(uri)
    found = False
    for silence in silences:
        if silence["status"]["state"] != "active":
            continue
        if silence["createdBy"] == createdBy and silence["comment"] == comment:
            if json.dumps(silence["matchers"], sort_keys=True) == json.dumps(
                matchers, sort_keys=True
            ):
                found = True
                break

    if not found:
        jsonPostRequest(
            uri,
            {
                "matchers": matchers,
                "startsAt": startsAt,
                "endsAt": endsAt,
                "createdBy": createdBy,
                "comment": comment,
            },
        )


def addAlerts(alerts):
    for api in APIs:
        jsonPostRequest("{}/api/v2/alerts".format(api), alerts)


def newMatcher(name, value, isRegex, isEqual=True):
    return {"name": name, "value": value, "isRegex": isRegex, "isEqual": isEqual}


def newAlert(labels, annotations=None, generatorURL="http://localhost:8082/graph"):
    return {
        "labels": labels,
        "annotations": annotations or {},
        "generatorURL": generatorURL,
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
            return [
                newAlert(
                    self._labels(
                        instance="server{}".format(i),
                        cluster=cluster,
                        severity="info",
                        job="node_exporter",
                        region="US",
                    ),
                    self._annotations(
                        summary="Silence this alert, it's always firing",
                        repo="Repo: https://github.com/prymitive/karma",
                        docs="https://karma-dashboard.io/docs/CONFIGURATION.html",
                    ),
                )
                for i in range(1, size)
            ]

        return _gen(10, "dev") + _gen(5, "staging") + _gen(3, "prod")


class RandomInstances(AlertGenerator):
    name = "Random Instances"
    comment = "This alerts will have a random number of instances"

    def alerts(self):
        instances = random.randint(0, 30)
        return [
            newAlert(
                self._labels(
                    instance="server{}".format(i),
                    cluster="staging",
                    severity="warning",
                    job="node_exporter",
                    region="US",
                ),
                self._annotations(
                    dashboard="https://www.google.com/search?q=" "server{}".format(i),
                    repo="Link to github.com maybe",
                ),
            )
            for i in range(0, instances)
        ]


class RandomName(AlertGenerator):
    name = "Random Alert Name"
    comment = "This alerts will have a random name"

    def alerts(self):
        alerts = []
        for i in range(0, 1):
            throw = random.randint(0, 1000)
            alerts.append(
                newAlert(
                    self._labels(
                        alertname="Alert Nr {}".format(throw),
                        instance="server{}".format(i),
                        cluster="dev",
                        severity="info",
                        job="random_exporter",
                        region="EU",
                    ),
                    self._annotations(
                        summary="This is a random alert",
                        dashboard="https://www.google.com/search?q="
                        "server{}".format(i),
                    ),
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
                self._labels(
                    instance="server{}".format(i),
                    cluster="dev",
                    severity="critical",
                    job="random_exporter",
                    region="EU",
                ),
                self._annotations(),
            )
            for i in range(0, 3)
        ]


class TimeAnnotation(AlertGenerator):
    name = "Time Annotation"
    comment = "This alert includes a 'time' annotation that changes every N \
              seconds"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server1",
                    cluster="prod",
                    severity="warning",
                    job="ntp_exporter",
                    region="AP",
                ),
                self._annotations(time=str(int(time.time()))),
            )
        ]


class DiskFreeLowAlert(AlertGenerator):
    name = "Disk Free Low"
    comment = "This alert simulates a warning about low disk space"

    def alerts(self):
        alerts = []
        for i in range(0, 10):
            spaceFree = throw = random.randint(0, 10)
            alerts.append(
                newAlert(
                    self._labels(
                        instance="server{}".format(i),
                        cluster="prod",
                        device="/dev/sda{}".format(i),
                        mount_point="/disk",
                        severity="critical",
                        job="node_exporter",
                        region="AP",
                    ),
                    self._annotations(
                        summary="Only {}% free space left on /disk".format(spaceFree),
                        dashboard="https://wikipedia.org/wiki/Disk_storage",
                        docs="https://karma-dashboard.io/docs/CONFIGURATION.html",
                    ),
                )
            )
        return alerts


class SilencedAlert(AlertGenerator):
    name = "Always Silenced Alert"
    comment = "This alert is always silenced"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server1",
                    cluster="prod",
                    severity="info",
                    job="mysql_exporter",
                    region="SA",
                ),
                self._annotations(
                    alertReference="https://www." "youtube.com/watch?v=dQw4w9WgXcQ"
                ),
            )
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [newMatcher("alertname", self.name, False)],
                "{}Z".format(now.isoformat()),
                "{}Z".format(
                    (
                        now + datetime.timedelta(minutes=random.randint(1, 60))
                    ).isoformat()
                ),
                "me@example.com",
                "This alert is always silenced and the silence comment is very "
                "long to test the UI. Lorem ipsum dolor sit amet, consectetur "
                "adipiscing elit, sed do eiusmod tempor incididunt ut labore et"
                " dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "
                "exercitation ullamco laboris nisi ut aliquip ex ea commodo "
                "consequat. Duis aute irure dolor in reprehenderit in voluptate"
                " velit esse cillum dolore eu fugiat nulla pariatur. Excepteur "
                "sint occaecat cupidatat non proident, sunt in culpa qui "
                "officia deserunt mollit anim id est laborum.",
            )
        ]


class MixedAlerts(AlertGenerator):
    name = "Mixed Alerts"
    comment = "Some alerts are silenced, some are not"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server{}".format(i),
                    cluster="prod",
                    severity="warning",
                    job="node_exporter",
                    region="SA",
                ),
                self._annotations(
                    alertReference="https://www." "youtube.com/watch?v=dQw4w9WgXcQ"
                ),
            )
            for i in range(1, 9)
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [
                    newMatcher("alertname", self.name, False),
                    newMatcher("instance", "server(1|3|5|7)", True),
                    newMatcher("cluster", "dev", False, isEqual=False),
                ],
                "{}Z".format(now.isoformat()),
                "{}Z".format(
                    (
                        now + datetime.timedelta(minutes=random.randint(1, 30))
                    ).isoformat()
                ),
                "me@example.com",
                "Silence '{}''".format(self.name),
            )
        ]


class LongNameAlerts(AlertGenerator):
    name = (
        "Some Alerts With A Ridiculously Long Name To Test Label Truncation"
        " In All The Places We Render Those Alerts"
    )
    comment = "This alert uses long strings to test the UI"

    def alerts(self):
        def _gen(size, cluster):
            return [
                newAlert(
                    self._labels(
                        instance="server{}".format(i),
                        cluster=cluster,
                        severity="info",
                        job="textfile_exporter",
                        region="CN",
                        thisIsAVeryLongLabelNameToTestLabelTruncationInAllThePlacesWeRenderItLoremIpsumDolorSitAmet="1",
                    ),
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
                        " mollit anim id est laborum vvvvvvvvveeeeeeeeeeee"
                        "errrrrrrrrrrrrrrrrrryyyyyyyyyyyyylllllllllooooooo"
                        "nnnnnnngggggggggggggggwwwwwwwwwwwwooooooooooooooo"
                        "rrrrrrrrrrrrrrddddddddddddddddddd"
                    ),
                )
                for i in range(1, size)
            ]

        return _gen(5, "dev") + _gen(1, "staging") + _gen(11, "prod")


class InhibitedAlert(AlertGenerator):
    name = "Inhibition Test Alert"
    comment = "This alert should be inhibited by another alert"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server1",
                    cluster="prod",
                    severity="warning",
                    job="textfile_exporter",
                    region="CN",
                ),
                self._annotations(),
            )
        ]


class InhibitingAlert(AlertGenerator):
    name = "Inhibition Test Alert"
    comment = "This alert should inhibit other alerts"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server1",
                    cluster="prod",
                    severity="critical",
                    job="textfile_exporter",
                    region="CN",
                ),
                self._annotations(),
            )
        ]


class SilencedAlertWithJiraLink(AlertGenerator):
    name = "Silenced Alert With Jira Link"
    comment = "This alert is always silenced and links to a Jira ticket"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server%d" % i,
                    cluster="staging",
                    severity="critical",
                    job="node_exporter",
                    region="AF",
                ),
                self._annotations(dashboard="https://www.atlassian.com/software/jira"),
            )
            for i in range(1, 9)
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [newMatcher("alertname", self.name, False)],
                "{}Z".format(now.isoformat()),
                "{}Z".format((now + datetime.timedelta(minutes=30)).isoformat()),
                "me@example.com",
                "DEVOPS-123 This text should be a link to the Jira ticket",
            )
        ]


class PaginationTest(AlertGenerator):
    name = "Pagination Test"
    comment = "Huge number of alerts to test pagination & lazy load"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server{}".format(i),
                    cluster="dev",
                    severity="warning",
                    job="node_exporter",
                    region="US",
                ),
                self._annotations(dashboard="https://example.com"),
            )
            for i in range(0, 500)
        ]

    def silences(self):
        now = datetime.datetime.utcnow().replace(microsecond=0)
        return [
            (
                [
                    newMatcher("alertname", self.name, False),
                    newMatcher("instance", "server{}".format(i), True),
                ],
                "{}Z".format(now.isoformat()),
                "{}Z".format(
                    (
                        now + datetime.timedelta(minutes=random.randint(1, 30))
                    ).isoformat()
                ),
                "me@example.com",
                "DEVOPS-123 Pagination Test alert silenced with a long text "
                "to see if it gets truncated properly. It only matches first "
                "20 alerts. "
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed "
                "do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                " Ut enim ad minim veniam, quis nostrud exercitation ullamco "
                "laboris nisi ut aliquip ex ea commodo consequat. ",
            )
            for i in range(0, 20)
        ]


class RichAnnotations(AlertGenerator):
    name = "Rich Annotations"
    comment = "This alert will have rich annotation"

    def alerts(self):
        return [
            newAlert(
                self._labels(
                    instance="server7",
                    cluster="staging",
                    severity="warning",
                    job="textfile_exporter",
                    region="SA",
                ),
                self._annotations(
                    html="<a href='http://localhost'>this is link</a>",
                    moreHTML="<div>this is a div</div>",
                    emoji="🤔🔥",
                    docs="🤔🔥 <div>this is a div</div>",
                ),
            )
        ]


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
        InhibitedAlert(MAX_INTERVAL),
        InhibitingAlert(MAX_INTERVAL),
        SilencedAlertWithJiraLink(MAX_INTERVAL),
        PaginationTest(MAX_INTERVAL),
        RichAnnotations(MAX_INTERVAL),
    ]
    while True:
        for g in generators:
            g.tick()
        time.sleep(1)
