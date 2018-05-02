# Configuration options

## Config file

By default unsee will try to read configuration file named `unsee.yaml` from
current directory. Configuration file uses [YAML](http://yaml.org/) format and
it needs to have `.yaml` extension.
Custom filename and directory can be passed via command line flags or
environment variables:

* `--config.file` flag or `CONFIG_FILE` env variable - name of the config file
  to load (without extension).
* `--config.dir` flag or `CONFIG_DIR` env variable - directory where config file
  can be found.

Example with flags:

    unsee --config.file example --config.dir ./docs/

Example with environment variables:

    CONFIG_FILE="example" CONFIG_DIR="./docs/" unsee

Example using both:

    CONFIG_FILE="example" unsee --config.dir ./docs/

### Alertmanagers

`alertmanager` section allows setting Alertmanager servers that should be
queried for alerts.
You can configure one or more Alertmanager servers, alerts
with identical label set will be deduplicated and labeled with each Alertmanager
server they were observed at. This allows using unsee to collect alerts from a
pair of Alertmanager instances running in
[HA mode](https://prometheus.io/docs/alerting/alertmanager/#high-availability).
Syntax:

```yaml
alertmanager:
  interval: duration
  servers:
    - name: string
      uri: string
      timeout: duration
      proxy: bool
      tls:
        ca: string
        cert: string
        key: string
```

* `interval` - how often alerts should be refreshed, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format. If set to
  `1m` unsee will query every Alertmanager server once a minute. This is global
  setting applied to every Alertmanager server. All instances will be queried
  in parallel.
  Note that the maximum value for this option is `15m`.
  The UI has a watchdog that tracks the timestamp of the last pull. If the UI
  does not receive updates for more than 15 minutes it will print an error and
  reload the page.
* `name` - name of this Alertmanager server, will be used as a label added to
  every alert in the UI and for filtering alerts using `@alertmanager=NAME`
  filter
* `uri` - base URI of this Alertmanager server. Supported URI schemes are
  `http://`, `https://` and `file://`. `file://` scheme is only useful for
  testing with JSON files, see [mock](/internal/mock/) dir for examples, files
  in this directory are used for running tests and when running demo instance
  of unsee with `make run`.
  If URI contains basic auth info
  (`https://user:password@alertmanager.example.com`) and you don't want it to
  be visible to users then ensure `proxy: true` is also set.
  Without proxy mode full URI needs to be passed to unsee web UI code.
  With proxy mode all requests will be routed via unsee HTTP server and since
  unsee has full URI in the config it only needs Alertmanager name in that
  request.
  `proxy: true` in order to avoid leaking auth information to the browser.
* `timeout` - timeout for requests send to this Alertmanager server, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format.
* `proxy` - if enabled requests from user browsers to this Alertmanager will be
  proxied via unsee. This applies to requests made when managing silences via
  unsee (creating or expiring silences).
* `tls:ca` - path to CA certificate used to establish TLS connection to this
  Alertmanager instance (for URIs using `https://` scheme). If unset or empty
  string is set then Go will try to find system CA certificates using well known
  paths.
* `tls:cert` - path to a TLS client certificate file to use when establishing
  TLS connections to this Alertmanager instance if it requires a TLS client
  authentication.
  Note that this option requires `tls:key` to be also set.
* `tls:key` - path to a TLS client key file to use when establishing
  TLS connections to this Alertmanager instance if it requires a TLS client
  authentication.
  Note that this option requires `tls:cert` to be also set.

Example with two production Alertmanager instances running in HA mode and a
staging instance that is also proxied:

```yaml
alertmanager:
  interval: 1m
  servers:
    - name: production1
      uri: https://alertmanager1.prod.example.com
      timeout: 20s
      proxy: false
    - name: production2
      uri: https://alertmanager2.prod.example.com
      timeout: 20s
      proxy: false
    - name: staging
      uri: https://alertmanager.staging.example.com
      timeout: 30s
      proxy: true
      tls:
        ca: /etc/ssl/staging-ca.crt
    - name: protected
      uri: https://alertmanager-auth.prod.example.com
      timeout: 20s
      tls:
        cert: /etc/ssl/client.pem
        key: /etc/ssl/client.key
```

Defaults:

```yaml
alertmanager:
  interval: 1m
  servers: []
```

There is no default for `alertmanager.servers` and it's a required option for
setting multiple Alertmanager servers. For cases where only a single server
needs to be configured without a config file see
[Simplified Configuration](#simplified-configuration).

### Annotations

`annotations` section allows configuring how alert annotation are displayed in
the UI.
Syntax:

```yaml
annotations:
  default:
    hidden: bool
  hidden: list of strings
  visible: list of strings
```

* `default:hidden` - bool, true if all annotations should be hidden by default.
* `hidden` - list of annotations that should be hidden by default.
* `visible` - list of annotations that should be visible by default when
  `default:hidden` is set to `true`.

Example where all annotations except `summary` are hidden by default. If there
are additional annotation keys user will need to click on the `+` icon to see
them.

```yaml
annotations:
  default:
    hidden: true
  hidden: []
  visible:
    - summary
```

Example where all annotations except `details` are visible by default. If
`details` annotation is present on any alert user will need to click on the `+`
icon to see it.

```yaml
annotations:
  default:
    hidden: false
  hidden:
    - details
  visible: []
```

Defaults:

```yaml
annotations:
  default:
    hidden: false
  hidden: []
  visible: []
```

### Filters

`filters` section allows configuring default set of filters used in the UI.

Syntax:

```yaml
filters:
  default: list of strings
```

* `default` - list of filters to use by default when user navigates to unsee
  web UI. Visit `/help` page in unsee for details on available filters.
  Note that if a string starts with `@` YAML requires to wrap it in quotes.

Example:

```yaml
filters:
  default:
    - "@state=active"
    - severity=critical
```

Defaults:

```yaml
filters:
  default: []
```

### Labels

`labels` section allows configuring how alert labels will be rendered in the
UI.
All labels will be parsed when collecting alerts from Alertmanager API and
used when deduplicating alerts, but some labels aren't useful to users and so
can be removed from the UI, this is controlled by `keep` and `strip` options.
`colors` section allows configuring which labels should have colors applied
to label background in the UI. Colors can help visually identify alerts
with shared labels, for example coloring hostname label will allow to quickly
spot all alerts for the same host.
Syntax:

```yaml
labels:
  color:
    static: []
    unique: []
  keep: list of strings
  strip: list of strings
```

* `color:static` - list of label names that will all have the same color applied
  (different than the default label color). This allows to quickly spot a
  specific label that can have high range of values, but it's important when
  reading the dashboard. For example coloring the instance label allows to
  quickly learn which instance is affected by given alert.
* `color:unique` - list of label names that should have unique colors generated
  in the UI.
* `keep` - list of allowed labels, if empty all labels are allowed.
* `strip` - list of ignored labels.

Example with static color for the `job` label (every `job` label will have the
same color regardless of the value) and unique color for the `@receiver` label
(every `@receiver` label will have color unique for each value).

```yaml
colors:
  labels:
    static:
      - job
    unique:
      - "@receiver"
```

Example where `task_id` label is ignored by unsee:

```yaml
labels:
  keep: []
  strip:
    - task_id
```

Example where all but `instance` and `alertname` labels are allowed:

```yaml
labels:
  keep:
    - alertname
    - instance
  strip: []
```

Defaults:

```yaml
labels:
  color:
    static: []
    unique: []
  keep: []
  strip: []
```

### Listen

`listen` section allows configuring unsee web server behavior.
Syntax:

```yaml
listen:
  address: string
  port: integer
  prefix: string
```

* `address` -
* `port` - HTTP port to listen on.
* `prefix` - URL root for unsee, you can use to if you wish to serve it from
  location other than `/`. This option is mostly useful when using unsee behind
  reverse proxy with other services on the same IP but different URL root.

Example where unsee would listen for HTTP requests on `http://1.2.3.4:80/unsee/`

```yaml
listen:
  address: 1.2.3.4
  port: 80
  prefix: /unsee/
```

Defaults:

```yaml
listen:
  address: "0.0.0.0"
  port: 8080
  prefix: /
```

### Log

`log` section allows configuring logging subsystem.
Syntax:

```yaml
log:
  config: bool
  level: string
```

* `config` - if set to `true` unsee will log used configuration on startup
* `level` - log level to set for unsee, possible values are debug, info,
  warning, error, fatal and panic.

Defaults:

```yaml
log:
  config: true
  level: info
```

### JIRA

`jira` section allows specifying a list of regex rules for finding links to Jira
issues in silence comments. If a string inside a comment matches one of the
rules it will be rendered as a link.
Syntax:

```yaml
jira:
  - regex: string
  - uri: string
```

* `regex` - regular expression for matching Jira issue ID.
* `uri` - base URL for Jira instance, `/browse/FOO-1` will be appended to it
  (where `FOO-1` is example issue ID).

Example where a string `DEVOPS-123` inside a comment would be rendered as a link
to `https://jira.example.com/browse/DEVOPS-123`.

```yaml
jira:
  - regex: DEVOPS-[0-9]+
    uri: https://jira.example.com
```

Defaults:

```yaml
jira: []
```

### Receivers

`receivers` section allows configuring how alerts from different receivers are
handled by unsee. If alerts are routed to multiple receivers they can be
duplicated in the UI, each instance will have different value for `@receiver`.
Syntax:

```yaml
receivers:
  keep: list of strings
  strip: list of strings
```

* `keep` - list of receivers name that are allowed, if empty all receivers are
  allowed.
* `strip` - list of receiver names that will not be shown in the UI.

Example where alerts that are routed to the `alertmanage2es` receiver are
ignored by unsee.

```yaml
receivers:
  strip:
    - alertmanage2es
```

Defaults:

```yaml
receivers:
  strip: []
```

### Sentry

`sentry` section allows configuring [Sentry](https://sentry.io) integration. See
[Sentry documentation](https://docs.sentry.io/quickstart/#configure-the-dsn) for
details.
Syntax:

```yaml
sentry:
  private: string
  public: string
```

* `private` - Sentry DSN for Go exceptions, this value is only used by unsee
  binary and never exposed to the user.
* `public` - Sentry DSN for JavaScript exceptions, this value will be exposed
  to the user browser.

Example:

```yaml
sentry:
  private: https://<key>:<secret>@sentry.io/<project>
  public: https://<key>:<secret>@sentry.io/<project>
```

## Command line flags

Config file options are mapped to command line flags, so `alertmanager:interval`
config file key is accessible as `--alertmanager.interval` flag, run
`unsee --help` to see a full list.
Exceptions for passing flags:

* `jira` - this option is a list of maps and it's only available when using
  config file.

There's no support for configuring multiple Alertmanager servers using
flags, but it's possible to configure a single Alertmanager instance this way,
see the [Simplified Configuration](#simplified-configuration) section.

## Environment variables

Environment variables are mapped in a similar way as command line flags,
`alertmanager:interval` is accessible as `ALERTMANAGER_INTERVAL` env.
Exceptions for passing flags:

* `HOST` - used by gin webserver, same effect as setting `listen:address` config
  option
* `PORT` - used by gin webserver, same effect as setting `listen:port` config
  option
* `SENTRY_DSN` - is used by Sentry itself, same effect as passing value to
  `sentry:private` config option.

There's no support for configuring multiple alertmanager servers using
environment variables, but it's possible to configure a single Alertmanager
instance this way, see the [Simplified Configuration](#simplified-configuration)
section.

## Simplified Configuration

To configure multiple Alertmanager instances unsee requires a config file, but
for a single Alertmanager instance cases it's possible to configure all
Alertmanager server options that are set for `alertmanager.servers` config
section using only flags or environment variables.

### Alertmanager URI

To set the `uri` key from `alertmanager.servers` map `ALERTMANAGER_URI` env or
`--alertmanager.uri` flag can be used.
Examples:

    ALERTMANAGER_URI=https://alertmanager.example.com unsee
    unsee --alertmanager.uri https://alertmanager.example.com

### Alertmanager name

To set the `name` key from `alertmanager.servers` map `ALERTMANAGER_NAME` env or
`--alertmanager.name` flag can be used.
Examples:

    ALERTMANAGER_NAME=single unsee
    unsee --alertmanager.name single

### Alertmanager timeout

To set the `timeout` key from `alertmanager.servers` map `ALERTMANAGER_TIMEOUT`
env or `--alertmanager.timeout` flag can be used.
Examples:

    ALERTMANAGER_TIMEOUT=10s unsee
    unsee --alertmanager.timeout 10s

### Alertmanager request proxy

To set the `proxy` key from `alertmanager.servers` map `ALERTMANAGER_PROXY`
env or `--alertmanager.proxy` flag can be used.
Examples:

    ALERTMANAGER_PROXY=true unsee
    unsee --alertmanager.proxy
