# unsee

Alert dashboard for [Prometheus Alertmanager](https://prometheus.io/docs/alerting/alertmanager/).

Alertmanager UI is useful for browsing alerts and managing silences, but it's
lacking as a dashboard tool - unsee aims to fill this gap.
It's developed as a dedicated tool as it's intended to provide only read access
to alert data, therefore safe to be accessed by wider audience.

## Building and running

### Build a Docker image

    make build

This will build a Docker image from sources.

### Running the Docker image in demo mode

    make demo

Will run locally build Docker image. This is intended for testing build Docker
images or checking unsee functionality.
By default unsee will listen on port `8080` and Alertmanager mock data will be
used, to override Alertmanager URI set `ALERTMANAGER_URI` and/or `PORT` make
variables. Example:

    make PORT=5000 ALERTMANAGER_URI=https://alertmanager.unicorn.corp run

### Running in dev mode

Requires Go.

    make dev

Will compile unsee and run the binary (not using Docker), by default will use
same port and Alertmanager URI as demo mode. This is intended for testing
changes.

### Environment variables

#### ALERTMANAGER_URI

URI of the Alertmanager instance, unsee will use it to pull alert groups and
silences. Endpoints in use:

* ${ALERTMANAGER_URI}/api/v1/alerts/groups
* ${ALERTMANAGER_URI}/api/v1/silences

This variable is required and there is no default value.

#### ALERTMANAGER_TIMEOUT

Timeout for requests send to Alertmanager, accepts values in
[time.Duration](https://golang.org/pkg/time/#Duration) format. Examples:

      ALERTMANAGER_TIMEOUT=10s
      ALERTMANAGER_TIMEOUT=2m

Default is `40s`.

#### DEBUG

Will enable [gin](https://github.com/gin-gonic/gin) debug mode. Examples:

    DEBUG=true
    DEBUG=false

Default is `false`.

#### COLOR_LABELS

List of label names that should have unique colors generated in the UI. Colors
can help visually identify alerts with shared labels, for example coloring
hostname label will allow to quickly spot all alerts for the same host.
Accepts space separated list of label names. Examples:

    COLOR_LABELS=hostname
    COLOR_LABELS="cluster environment rack"

This variable is optional and default is not set (no label will have unique
color).

#### DEFAULT_FILTER

Default alert filter to apply when user loads unsee UI without any filter
specified. Accepts comma separated list of filter expressions (visit /help page
in unsee for details on filters). Examples:

    DEFAULT_FILTER=level=critical
    DEFAULT_FILTER="cluster=prod,instance=~prod"

Default is not set (no filter will be applied).

#### JIRA_REGEX

This allows to define regex rules that will be applied to silence comments.
Regex rules will be used to discover JIRA issue IDs in the comment text and
inject links to those issues, instead of rendering as plain text.
Rule syntax:

    $(regex)@$(jira url)

Accepts space separated list of rules. Examples:

    JIRA_REGEX="DEVOPS-[0-9]+@https://jira.unicorn.corp

The above will match DEVOPS-123 text in the silence comment string and convert
it to `https://jira.unicorn.corp/browse/DEVOPS-123` link.

This variable is optional and default is not set (no rule will be applied).

#### UPDATE_INTERVAL

Interval for refreshing alerts and silences, tells unsee how often pull new
data from Alertmanager, accepts values in
[time.Duration](https://golang.org/pkg/time/#Duration) format. Examples:

    UPDATE_INTERVAL=30s
    UPDATE_INTERVAL=5m

Default is `1m`.

#### SENTRY_DSN

DSN for [Sentry](https://sentry.io) integration in Go. See
[Sentry documentation](https://docs.sentry.io/quickstart/#configure-the-dsn) for
details. Example:

    SENTRY_DSN=https://<key>:<secret>@sentry.io/<project>

This variable is optional and default is not set (Sentry support is disabled for
Go errors).

#### SENTRY_PUBLIC_DSN

DSN for [Sentry](https://sentry.io) integration in javascript. See
[Sentry documentation](https://docs.sentry.io/clients/javascript/) for details.
Example:

    SENTRY_PUBLIC_DSN=https://<key>@sentry.io/<project>

This variable is optional and default is not set (Sentry support is disabled for
javascript errors).

#### STATIC_COLOR_LABELS

List of label names that will all have the same color applied (different than
the default label color). This allows to quickly spot a specific label that
can have high range of values, but it's important when reading the dashboard.
For example coloring the instance label allows to quickly learn which instance
is affected by given alert. Accepts space separated list of label names.
Examples:

    STATIC_COLOR_LABELS=instance
    STATIC_COLOR_LABELS="instance cluster"

This variable is optional and default is not set (no label will have static
color).

#### STRIP_LABELS

List of label names that should not be shown on the UI. This allows to hide some
labels that are not needed on the alert dashboard. Accepts space separated list
of label names. Examples:

    STRIP_LABELS=exporter_type
    STRIP_LABELS="prometheus_instance alert_type"

This variable is optional and default is not set (all labels will be shown).
