# unsee

Alert dashboard for [Prometheus Alertmanager](https://prometheus.io/docs/alerting/alertmanager/).

Alertmanager UI is useful for browsing alerts and managing silences, but it's
lacking as a dashboard tool - unsee aims to fill this gap.
It's developed as a dedicated tool as it's intended to provide only read access
to alert data, therefore safe to be accessed by wider audience.

## Building and running

### Running in dev mode

Requires Go.

    make dev

Will compile unsee and run the binary (not using Docker), by default will use
same port and Alertmanager URI as demo mode. This is intended for local
development.

### Build a Docker image

    make docker-image

This will build a Docker image from sources.

### Running the Docker image in demo mode

    make demo

Will run locally build Docker image. This is intended for testing build Docker
images or checking unsee functionality.
By default unsee will listen on port `8080` and Alertmanager mock data will be
used, to override Alertmanager URI set `ALERTMANAGER_URI` and/or `PORT` make
variables. Example:

    make PORT=5000 ALERTMANAGER_URI=https://alertmanager.example.com run

### Environment variables

#### ALERTMANAGER_TIMEOUT

Timeout for requests send to Alertmanager, accepts values in
[time.Duration](https://golang.org/pkg/time/#Duration) format. Examples:

      ALERTMANAGER_TIMEOUT=10s
      ALERTMANAGER_TIMEOUT=2m

This option can also be set using `-alertmanager.timeout` flag. Example:

      $ unsee -alertmanager.timeout 2m

Default is `40s`.

#### ALERTMANAGER_TTL

Interval for refreshing alerts and silences, tells unsee how often pull new
data from Alertmanager, accepts values in
[time.Duration](https://golang.org/pkg/time/#Duration) format. Examples:

    ALERTMANAGER_TTL=30s
    ALERTMANAGER_TTL=5m

This option can also be set using `-alertmanager.ttl` flag. Example:

    $ unsee -alertmanager.ttl 5m

Default is `1m`.

#### ALERTMANAGER_URI

URI of the Alertmanager instance, unsee will use it to pull alert groups and
silences. Endpoints in use:

* ${ALERTMANAGER_URI}/api/v1/alerts/groups
* ${ALERTMANAGER_URI}/api/v1/silences

Example:

    ALERTMANAGER_URI=https://alertmanager.example.com

This option can also be set using `-alertmanager.uri` flag. Example:

    $ unsee -alertmanager.uri https://alertmanager.example.com

This variable is required and there is no default value.

#### DEBUG

Will enable [gin](https://github.com/gin-gonic/gin) debug mode. Examples:

    DEBUG=true
    DEBUG=false

This option can also be set using `-debug` flag. Example:

    $ unsee -debug

Default is `false`.

#### COLOR_LABELS_STATIC

List of label names that will all have the same color applied (different than
the default label color). This allows to quickly spot a specific label that
can have high range of values, but it's important when reading the dashboard.
For example coloring the instance label allows to quickly learn which instance
is affected by given alert. Accepts space separated list of label names.
Examples:

    COLOR_LABELS_STATIC=instance
    COLOR_LABELS_STATIC="instance cluster"

This option can also be set using `-color.labels.static` flag. Example:

    $ unsee -color.labels.static "instance cluster"

This variable is optional and default is not set (no label will have static
color).

#### COLOR_LABELS_UNIQUE

List of label names that should have unique colors generated in the UI. Colors
can help visually identify alerts with shared labels, for example coloring
hostname label will allow to quickly spot all alerts for the same host.
Accepts space separated list of label names. Examples:

    COLOR_LABELS_UNIQUE=hostname
    COLOR_LABELS_UNIQUE="cluster environment rack"

This option can also be set using `-color.labels.unique` flag. Example:

    $ unsee -color.labels.unique "cluster environment rack"

This variable is optional and default is not set (no label will have unique
color).

#### FILTER_DEFAULT

Default alert filter to apply when user loads unsee UI without any filter
specified. Accepts comma separated list of filter expressions (visit /help page
in unsee for details on filters). Examples:

    FILTER_DEFAULT=level=critical
    FILTER_DEFAULT="cluster=prod,instance=~prod"

This option can also be set using `-filter.default` flag. Example:

    $ unsee -filter.default "cluster=prod,instance=~prod"

Default is not set (no filter will be applied).

#### JIRA_REGEX

This allows to define regex rules that will be applied to silence comments.
Regex rules will be used to discover JIRA issue IDs in the comment text and
inject links to those issues, instead of rendering as plain text.
Rule syntax:

    $(regex)@$(jira url)

Accepts space separated list of rules. Examples:

    JIRA_REGEX="DEVOPS-[0-9]+@https://jira.example.com"

The above will match DEVOPS-123 text in the silence comment string and convert
it to `https://jira.example.com/browse/DEVOPS-123` link.

This option can also be set using `-jira.regex` flag. Example:

    $ unsee -jira.regex "DEVOPS-[0-9]+@https://jira.example.com"

This variable is optional and default is not set (no rule will be applied).

#### SENTRY_DSN

DSN for [Sentry](https://sentry.io) integration in Go. See
[Sentry documentation](https://docs.sentry.io/quickstart/#configure-the-dsn) for
details. Example:

    SENTRY_DSN=https://<key>:<secret>@sentry.io/<project>

This option can also be set using `-sentry.dsn` flag. Example:

    $ unsee -sentry.dsn "https://<key>:<secret>@sentry.io/<project>"

This variable is optional and default is not set (Sentry support is disabled for
Go errors).

#### SENTRY_PUBLIC_DSN

DSN for [Sentry](https://sentry.io) integration in javascript. See
[Sentry documentation](https://docs.sentry.io/clients/javascript/) for details.
Example:

    SENTRY_PUBLIC_DSN=https://<key>@sentry.io/<project>

This option can also be set using `-sentry.public.dsn` flag. Example:

    $ unsee -sentry.public.dsn "https://<key>@sentry.io/<project>"

This variable is optional and default is not set (Sentry support is disabled for
javascript errors).

#### STRIP_LABELS

List of label names that should not be shown on the UI. This allows to hide some
labels that are not needed on the alert dashboard. Accepts space separated list
of label names. Examples:

    STRIP_LABELS=exporter_type
    STRIP_LABELS="prometheus_instance alert_type"

This option can also be set using `-strip.labels` flag. Example:

    $ unsee -strip.labels "prometheus_instance alert_type"

This variable is optional and default is not set (all labels will be shown).
