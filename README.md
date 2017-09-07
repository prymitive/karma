# unsee

Alert dashboard for [Prometheus Alertmanager](https://prometheus.io/docs/alerting/alertmanager/).

Alertmanager UI is useful for browsing alerts and managing silences, but it's
lacking as a dashboard tool - unsee aims to fill this gap.
Starting with `0.7.0` release it can also aggregate alerts from multiple
Alertmanager instances, running either in HA mode or separate. Duplicated alerts
are deduplicated so only unique alerts are displayed. Each alert is tagged with
names of all  Alertmanager instances it was found at and can be filtered based
on those tags.

![Screenshot](/screenshot.png)

To get notifications about new unsee releases you can subscribe to the RSS feed
that GitHub provides - https://github.com/cloudflare/unsee/releases.atom
To get email notifications please use one of the free services providing
_RSS to email_ notifications, like [Blogtrottr](https://blogtrottr.com/).

## Supported Alertmanager versions

Alertmanager's API isn't stable yet and can change between releases,
see `VERSIONS` in [mock/Makefile](/mock/Makefile) for list of all Alertmanager
releases that are tested and supported by unsee.
Due to API differences between those releases some features will work
differently or be missing, it's recommended to use the latest supported
Alertmanager version.

## Security

The unsee process doesn't send any API request to the Alertmanager that could
modify alerts or silence state, but it does provide a web interface that allows
a user to send such requests directly to the Alertmanager API.
If you wish to deploy unsee as a read-only tool please ensure that:

  * the unsee process is able to connect to the Alertmanager API
  * read-only users are able to connect to the unsee web interface
  * read-only users are NOT able to connect to the Alertmanager API

## Metrics

unsee process metrics are accessible under `/metrics` path by default.
If you set the [WEB_PREFIX](#web_prefix) option a path relative to it will be
used.

## Building and running

### Building from source

To clone git repo and build the binary yourself run:

    git clone https://github.com/cloudflare/unsee $GOPATH/src/github.com/cloudflare/unsee
    cd $GOPATH/src/github.com/cloudflare/unsee

To finally compile `unsee` the binary run:

    make

Note that building locally from sources requires Go, nodejs and npm.
See Docker build options below for instructions on building from withing docker
container.

## Running

`unsee` is configured via environment variables or command line flags.
Environment variable `ALERTMANAGER_URIS` or cli flag `-alertmanager.uris` is the
only option required to run. See [Environment variables](#environment-variables)
section below for the full list of supported environment variables. Examples:

    ALERTMANAGER_URIS=default:https://alertmanager.example.com unsee
    unsee -alertmanager.uris default:https://alertmanager.example.com

There is a make target which will compile and run unsee:

    make run

By default it will listen on port `8080` and Alertmanager mock data will be
used, to override Alertmanager URI set `ALERTMANAGER_URIS` and/or `PORT` make
variables. Example:

    make PORT=5000 ALERTMANAGER_URIS=default:https://alertmanager.example.com run

## Docker

### Running pre-build docker image

Official docker images are built and hosted on
[hub.docker.com](https://hub.docker.com/r/cloudflare/unsee/).

Images are built automatically for:

  * release tags in git - `cloudflare/unsee:vX.Y.Z`
  * master branch commits - `cloudflare/unsee:latest`

#### Examples

To start a release image run:

  docker run -e ALERTMANAGER_URIS=default:https://alertmanager.example.com cloudflare/unsee:vX.Y.Z

Latest release details can be found on
[GitHub](https://github.com/cloudflare/unsee/releases).

To start docker image build from lastet master branch run:

  docker run -e ALERTMANAGER_URIS=default:https://alertmanager.example.com cloudflare/unsee:latest

Note that latest master branch might have bugs or breaking changes. Using
release images is strongly recommended for any production use.

### Building a Docker image

    make docker-image

This will build a Docker image from sources.

### Running the Docker image

    make run-docker

Will run locally built Docker image. Same defaults and override variables
apply as with `make run`. Example:

    make PORT=5000 ALERTMANAGER_URIS=default:https://alertmanager.example.com run-docker

## Environment variables

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

Note that the maximum value for this option is `15m`.
The UI has a watchdog that tracks the timestamp of the last pull. If the UI
does not receive updates for more than 15 minutes it will print an error and
reload the page.

#### ALERTMANAGER_URIS

List of Alertmanager instances URI, unsee will use it to pull alert groups and
silences from all defined instances and deduplicate all alerts.
API endpoints in use:

* ${ALERTMANAGER_URI}/api/v1/alerts/groups
* ${ALERTMANAGER_URI}/api/v1/silences

Expected syntax:

    ${name1}:${uri} ${name2}:{uri}

Supported URI schemes:

* http://
* https://
* file://

`file://` scheme is only useful for testing purposes, it's used for `make run`
target.

Example:

    ALERTMANAGER_URIS="prod:https://prod.alertmanager.example.com staging:https://staging.alertmanager.example.com"

This option can also be set using `-alertmanager.uris` flag. Example:

    $ unsee -alertmanager.uris "prod:https://prod.alertmanager.example.com staging:https://staging.alertmanager.example.com"

This variable is required and there is no default value.

#### ANNOTATIONS_DEFAULT_HIDDEN

Enabling this option will hide all annotations in the UI, except for those
that are listed in the `ANNOTATIONS_VISIBLE` option.

Examples:

    ANNOTATIONS_DEFAULT_HIDDEN=true
    ANNOTATIONS_DEFAULT_HIDDEN=false

This option can also be set using `-annotations.default.hidden` flag. Example:

    $ unsee -annotations.default.hidden

Default is `false`, which means that all annotations are visible.

#### ANNOTATIONS_HIDDEN

List of annotation names that should be hidden in the UI. Hidden annotations
can still be accessed if needed by clicking on a zoom button that will appear
if there are any hidden annotations.

Examples:

    ANNOTATIONS_HIDDEN=summary
    ANNOTATIONS_HIDDEN="summary owner"

This option can also be set using `-annotations.hidden` flag. Example:

    $ unsee -annotations.hidden "summary owner"

This variable is optional and default is not set (all annotations are visible),
unless user enables `ANNOTATIONS_DEFAULT_HIDDEN` option.

#### ANNOTATIONS_VISIBLE

List of annotation names that should be visible in the UI. This option is only
useful when `ANNOTATIONS_DEFAULT_HIDDEN` is set.
With `ANNOTATIONS_DEFAULT_HIDDEN` all annotations are hidden by default unless
they are present in the `ANNOTATIONS_VISIBLE` option.
If `ANNOTATIONS_DEFAULT_HIDDEN` is not enabled this option is no-op.

Examples:

    ANNOTATIONS_VISIBLE=summary
    ANNOTATIONS_VISIBLE="summary owner"

This option can also be set using `-annotations.visible` flag. Example:

    $ unsee -annotations.visible "summary owner"

This variable is optional and default is not set.
If `ANNOTATIONS_HIDDEN` is enabled then all annotations are hidden by default.
If `ANNOTATIONS_HIDDEN` is not enabled then all annotations are visible by
default.

#### DEBUG

Will enable [gin](https://github.com/gin-gonic/gin) debug mode. This will
configure to print out more debugging information on startup and enable
[https://golang.org/pkg/net/http/pprof/](pprof) debug endpoints.

Examples:

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

#### KEEP_LABELS

List of label names to show on the UI, all other labels will be stripped.
This allows to hide all labels except selected few that are useful on the
alert dashboard. Accepts space separated list of label names. Examples:

    KEEP_LABELS=instance
    KEEP_LABELS="host severity"

This option can also be set using `-keep.labels` flag. Example:

    $ unsee -keep.labels "host severity"

This variable is optional and default is not set (all labels will be shown).

#### PORT

HTTP port to listen on. Example:

    PORT=8000

This option can also be set using `-port` flag. Example:

    $ unsee -port 8000

Default is `8080`.

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

#### WEB_PREFIX

URL root for unsee, you can use to if you wish to serve it from location other
than /. Examples:

    WEB_PREFIX=/unsee/

This will configure unsee to serve requests from http://localhost/unsee/
instead http://localhost/.

This option can also be set using `-web.prefix` flag. Example:

    $ unsee -web.prefix /unsee/

Default is `/`.

## Contributing

Please see [CONTRIBUTING](/CONTRIBUTING.md) for details.

## License

Apache License 2.0, please see [LICENSE](/LICENSE).
