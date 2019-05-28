# Configuration options

## Config file

By default karma will try to read configuration file named `karma.yaml` from
current directory. Configuration file uses [YAML](http://yaml.org/) format and
it needs to have `.yaml` extension.
Custom filename and directory can be passed via command line flags or
environment variables:

- `--config.file` flag or `CONFIG_FILE` env variable - path to the config file

Example with flags:

```shell
karma --config.file docs/example.yaml
```

Example with environment variables:

```shell
CONFIG_FILE="docs/example.yaml"
```

### Alertmanagers

`alertmanager` section allows setting Alertmanager servers that should be
queried for alerts.
You can configure one or more Alertmanager servers, alerts
with identical label set will be deduplicated and labeled with each Alertmanager
server they were observed at. This allows using karma to collect alerts from a
pair of Alertmanager instances running in
[HA mode](https://prometheus.io/docs/alerting/alertmanager/#high-availability).
Syntax:

```YAML
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
        insecureSkipVerify: bool
      headers:
        any: string
```

- `interval` - how often alerts should be refreshed, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format. If set to
  `1m` karma will query every Alertmanager server once a minute. This is global
  setting applied to every Alertmanager server. All instances will be queried
  in parallel.
  Note that the maximum value for this option is `15m`.
  The UI has a watchdog that tracks the timestamp of the last pull. If the UI
  does not receive updates for more than 15 minutes it will print an error and
  reload the page.
- `name` - name of this Alertmanager server, will be used as a label added to
  every alert in the UI and for filtering alerts using `@alertmanager=NAME`
  filter
- `uri` - base URI of this Alertmanager server. Supported URI schemes are
  `http://`, `https://` and `file://`. `file://` scheme is only useful for
  testing with JSON files, see [mock](/internal/mock/) dir for examples, files
  in this directory are used for running tests and when running demo instance
  of karma with `make run`.
  If URI contains basic auth info
  (`https://user:password@alertmanager.example.com`) and you don't want it to
  be visible to users then ensure `proxy: true` is also set.
  Without proxy mode full URI needs to be passed to karma web UI code.
  With proxy mode all requests will be routed via karma HTTP server and since
  karma has full URI in the config it only needs Alertmanager name in that
  request.
  `proxy: true` in order to avoid leaking auth information to the browser.
- `timeout` - timeout for requests send to this Alertmanager server, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format.
- `proxy` - if enabled requests from user browsers to this Alertmanager will be
  proxied via karma. This applies to requests made when managing silences via
  karma (creating or expiring silences).
- `tls:ca` - path to CA certificate used to establish TLS connection to this
  Alertmanager instance (for URIs using `https://` scheme). If unset or empty
  string is set then Go will try to find system CA certificates using well known
  paths.
- `tls:cert` - path to a TLS client certificate file to use when establishing
  TLS connections to this Alertmanager instance if it requires a TLS client
  authentication.
  Note that this option requires `tls:key` to be also set.
- `tls:key` - path to a TLS client key file to use when establishing
  TLS connections to this Alertmanager instance if it requires a TLS client
  authentication.
  Note that this option requires `tls:cert` to be also set.
- `tls:insecureSkipVerify` - disable server certificate validation, can be set
  to allow using self-signed certs, use at your own risk
- `headers` - a map with a list of key: values which are header: value.
  These custom headers will be sent with every request to the alert manager
  instance.

Example with two production Alertmanager instances running in HA mode and a
staging instance that is also proxied and requires a custom auth header:

```YAML
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
      headers:
        X-Auth-Token: aValidToken
    - name: protected
      uri: https://alertmanager-auth.prod.example.com
      timeout: 20s
      tls:
        cert: /etc/ssl/client.pem
        key: /etc/ssl/client.key
    - name: self-signed
      uri: https://test.example.com
      tls:
        insecureSkipVerify: true
```

Defaults:

```YAML
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

```YAML
annotations:
  default:
    hidden: bool
  hidden: list of strings
  visible: list of strings
  keep: list of strings
  strip: list of strings
```

- `default:hidden` - bool, true if all annotations should be hidden by default.
- `hidden` - list of annotations that should be hidden by default.
- `visible` - list of annotations that should be visible by default when
  `default:hidden` is set to `true`.
- `keep` - list of allowed annotations, if empty all annotations are allowed.
- `strip` - list of ignored annotations.

The difference between `hidden`/`visible` and `keep`/`strip` is that hidden
annotations are still accessible, but they are shown in the UI collapsed by
default (only name is visible, value is shown after clicking), while stripped
annotations are removed entirely and never presented to the user.

Example where all annotations except `summary` are hidden by default. If there
are additional annotation keys user will need to click on the `+` icon to see
them.

```YAML
annotations:
  default:
    hidden: true
  hidden: []
  visible:
    - summary
  keep: []
  strip:
    - help
    - verylong
```

Example where all annotations except `details` are visible by default. If
`details` annotation is present on any alert user will need to click on the `+`
icon to see it. Additionally `secret` annotation is stripped and never shown
in the UI.

```YAML
annotations:
  default:
    hidden: false
  hidden:
    - details
  visible: []
  keep: []
  strip:
    - secret
```

Defaults:

```YAML
annotations:
  default:
    hidden: false
  hidden: []
  visible: []
```

### Filters

`filters` section allows configuring default set of filters used in the UI.

Syntax:

```YAML
filters:
  default: list of strings
```

- `default` - list of filters to use by default when user navigates to karma
  web UI. Visit `/help` page in karma for details on available filters.
  Note that if a string starts with `@` YAML requires to wrap it in quotes.

Example:

```YAML
filters:
  default:
    - "@state=active"
    - severity=critical
```

Defaults:

```YAML
filters:
  default: []
```

### Grid

`grid` section allows customizing how alert grid is rendered in the UI.
Sorting configuration can be overridden by each user via UI settings.
Syntax:

```YAML
grid:
  sorting:
    order: string
    reverse: bool
    label: string
    customValues:
      labels: dict
```

- `sorting:order` - default sort order for alert grid, valid values are:
  - `disabled` - no sorting, alert groups are rendered in the order they are
    returned by the API
  - `startsAt` - sort by alert timestamps, most recent alert in each group will
    be used when comparing each group
  - `label` - sort by labels, if the label used for sorting is not shared by
    all alerts in a group then the first alert in the group will be queried for
    it
- `sorting:reverse` - default value for reversed sort order
- `sorting:label` - label name for sorting when `grid:sorting:order` is set
  to `label`. Labels can be assigned custom values used only by sorting via
  `sorting:customValues:labels`.
- `sorting:customValues:labels` - when sorting using alert labels values are
  compared as strings, which work for labels like `cluster=A`, `cluster=B` &
  `cluster=C`, but not for `cluster=prod`, `cluster=staging` & `cluster=dev`.
  Alphabetic sort would order the second case as follows: `dev`, `prod`,
  `staging`. To allow for more natural sorting `sorting:valueMapping` can be
  used to map label values to integer values which will be used for sorting
  instead of original string values.
  Note: this option is not available via environment variables, you can only set
  it via the config file.

Defaults:

```YAML
grid:
  sorting:
    order: startsAt
    reverse: true
    label: alertname
    customValues:
      labels: {}
```

Example with sorting using `severity` label and value mappings for it:

```YAML
grid:
  sorting:
    order: label
    reverse: false
    label: severity
    customValues:
      labels:
        severity:
          critical: 1
          warning: 2
          info: 3
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

```YAML
labels:
  color:
    static: list of strings
    unique: list of strings
    custom:
      foo:
        - value: string
          value_re: string
          color: string
  keep: list of strings
  strip: list of strings
```

- `color:static` - list of label names that will all have the same color applied
  (different than the default label color). This allows to quickly spot a
  specific label that can have high range of values, but it's important when
  reading the dashboard. For example coloring the instance label allows to
  quickly learn which instance is affected by given alert.
- `color:unique` - list of label names that should have unique colors generated
  in the UI.
- `color:custom` - nested map of label names and value with colors - this allows
  to configure a set of labels with custom predefined colors applied to them
  rather than generated. Value is a mapping with `label name` ->
  `list of dicts`, each dict object allows setting:

  - `value` - the exact value of the label to match against
  - `value_re` - Go compatible
    [regular expression](https://golang.org/pkg/regexp/) to match against
  - `color`: color to apply if either `value` or `value_re` matches

  Either `value` or `value_re` is required, both can be set in which case
  `value` with be tested first. Entries are evaluated in the order they appear
  in the config file.
  Note: this option is not available via environment variables, you can only set
  it via the config file.

- `keep` - list of allowed labels, if empty all labels are allowed.
- `strip` - list of ignored labels.

Example with static color for the `job` label (every `job` label will have the
same color regardless of the value) and unique color for the `@receiver` label
(every `@receiver` label will have color unique for each value).

```YAML
labels:
  color:
    static:
      - job
    unique:
      - "@receiver"
```

Example where `task_id` label is ignored by karma:

```YAML
labels:
  keep: []
  strip:
    - task_id
```

Example where all but `instance` and `alertname` labels are allowed:

```YAML
labels:
  keep:
    - alertname
    - instance
  strip: []
```

Example where `severity` label will have a red color for `critical`, yellow
for `warning` and blue for `info`:

```YAML
labels:
  color:
    custom:
      "@alertmanager":
        - value: prod
          color: "#e6e"
      severity:
        - value: info
          color: "#87c4e0"
        - value: warning
          color: "#ffae42"
        - value: critical
          color: "#ff220c"
```

Example with a regex value, `info`, `warning` and `critical` will get colors
as below, but any value not matching those 3 values will use the color from
`.*`:

```YAML
labels:
  color:
    custom:
      severity:
        - value: info
          color: "#87c4e0"
        - value: warning
          color: "#ffae42"
        - value: critical
          color: "#ff220c"
        - value_re: ".*"
          color: "#736598"
```

Note: be sure to set fallback values at the end of the list, so they're only
evaluated if there's no exact value match

Defaults:

```YAML
labels:
  color:
    static: []
    unique: []
    custom: {}
  keep: []
  strip: []
```

### Listen

`listen` section allows configuring karma web server behavior.
Syntax:

```YAML
listen:
  address: string
  port: integer
  prefix: string
```

- `address` - Hostname or IP to listen on.
- `port` - HTTP port to listen on.
- `prefix` - URL root for karma, you can use to if you wish to serve it from
  location other than `/`. This option is mostly useful when using karma behind
  reverse proxy with other services on the same IP but different URL root.

Example where karma would listen for HTTP requests on `http://1.2.3.4:80/karma/`

```YAML
listen:
  address: 1.2.3.4
  port: 80
  prefix: /karma/
```

Defaults:

```YAML
listen:
  address: "0.0.0.0"
  port: 8080
  prefix: /
```

### Log

`log` section allows configuring logging subsystem.
Syntax:

```YAML
log:
  config: bool
  level: string
  format: string
```

- `config` - if set to `true` karma will log used configuration on startup
- `level` - log level to set for karma, possible values are `debug`, `info`,
  `warning`, `error`, `fatal` and `panic`.
- `format` - controls how log messages are formatted, possible values are
  `text` and `json`. If set to `json` each log will be a JSON object.

Defaults:

```YAML
log:
  config: true
  level: info
  format: text
```

### JIRA

`jira` section allows specifying a list of regex rules for finding links to Jira
issues in silence comments. If a string inside a comment matches one of the
rules it will be rendered as a link.
Syntax:

```YAML
jira:
  - regex: string
  - uri: string
```

- `regex` - regular expression for matching Jira issue ID.
- `uri` - base URL for Jira instance, `/browse/FOO-1` will be appended to it
  (where `FOO-1` is example issue ID).

Example where a string `DEVOPS-123` inside a comment would be rendered as a link
to `https://jira.example.com/browse/DEVOPS-123`.

```YAML
jira:
  - regex: DEVOPS-[0-9]+
    uri: https://jira.example.com
```

Defaults:

```YAML
jira: []
```

### Receivers

`receivers` section allows configuring how alerts from different receivers are
handled by karma. If alerts are routed to multiple receivers they can be
duplicated in the UI, each instance will have different value for `@receiver`.
Syntax:

```YAML
receivers:
  keep: list of strings
  strip: list of strings
```

- `keep` - list of receivers name that are allowed, if empty all receivers are
  allowed.
- `strip` - list of receiver names that will not be shown in the UI.

Example where alerts that are routed to the `alertmanage2es` receiver are
ignored by karma.

```YAML
receivers:
  strip:
    - alertmanage2es
```

Defaults:

```YAML
receivers:
  strip: []
```

### Sentry

`sentry` section allows configuring [Sentry](https://sentry.io) integration. See
[Sentry documentation](https://docs.sentry.io/quickstart/#configure-the-dsn) for
details.
Syntax:

```YAML
sentry:
  private: string
  public: string
```

- `private` - Sentry DSN for Go exceptions, this value is only used by karma
  binary and never exposed to the user.
- `public` - Sentry DSN for JavaScript exceptions, this value will be exposed
  to the user browser.

Example:

```YAML
sentry:
  private: https://<key>:<secret>@sentry.io/<project>
  public: https://<key>:<secret>@sentry.io/<project>
```

## Silence form

`silenceForm` section allow customizing silence form behavior.
Syntax:

```YAML
silenceForm:
  strip:
    labels: list of strings
```

- `strip:labels` - list of labels to ignore when populating silence form from
  individual alerts or group of alerts. This allows to create silences matching
  only unique labels, like `instance` or `host`, ignoring any common labels like
  `job`.

Example:

```YAML
silenceForm:
  strip:
    labels:
      - job
```

## Customizing karma

In order to keep the core code simple karma doesn't support any way of extending
provided functionality. There is however possibility to inject custom CSS &
JavaScript code, which can be used to either override built in CSS styles
or integrate with extra services, for example using error handlers other than
Sentry.

```YAML
custom:
  css: string
  js: string
```

- `css` - path to a CSS file
- `js` - path to JavaScript file

Example:

```YAML
custom:
  css: /theme/custom.css
  js: /assets/custom.js
```

Use at your own risk and be aware that used CSS class names might change without
warning. This feature is provided as is without any guarantees.

There is an example `dark.css` file providing a dark theme. It's included in the
docker image as `/themes/dark.css` and can be enabled by passing environment
variable via docker:

```shell
-e CUSTOM_CSS=/themes/dark.css
```

## Command line flags

Config file options are mapped to command line flags, so `alertmanager:interval`
config file key is accessible as `--alertmanager.interval` flag, run
`karma --help` to see a full list.
Exceptions for passing flags:

- `jira` - this option is a list of maps and it's only available when using
  config file.

There's no support for configuring multiple Alertmanager servers using
flags, but it's possible to configure a single Alertmanager instance this way,
see the [Simplified Configuration](#simplified-configuration) section.

## Environment variables

Environment variables are mapped in a similar way as command line flags,
`alertmanager:interval` is accessible as `ALERTMANAGER_INTERVAL` env.
Exceptions for passing flags:

- `HOST` - used by gin webserver, same effect as setting `listen:address` config
  option
- `PORT` - used by gin webserver, same effect as setting `listen:port` config
  option
- `SENTRY_DSN` - is used by Sentry itself, same effect as passing value to
  `sentry:private` config option.

There's no support for configuring multiple alertmanager servers using
environment variables, but it's possible to configure a single Alertmanager
instance this way, see the [Simplified Configuration](#simplified-configuration)
section.

## Simplified Configuration

To configure multiple Alertmanager instances karma requires a config file, but
for a single Alertmanager instance cases it's possible to configure all
Alertmanager server options that are set for `alertmanager.servers` config
section using only flags or environment variables.

### Alertmanager URI

To set the `uri` key from `alertmanager.servers` map `ALERTMANAGER_URI` env or
`--alertmanager.uri` flag can be used.
Examples:

```shell
ALERTMANAGER_URI=https://alertmanager.example.com karma
karma --alertmanager.uri https://alertmanager.example.com
```

### Alertmanager name

To set the `name` key from `alertmanager.servers` map `ALERTMANAGER_NAME` env or
`--alertmanager.name` flag can be used.
Examples:

```shell
ALERTMANAGER_NAME=single karma
karma --alertmanager.name single
```

### Alertmanager timeout

To set the `timeout` key from `alertmanager.servers` map `ALERTMANAGER_TIMEOUT`
env or `--alertmanager.timeout` flag can be used.
Examples:

```shell
ALERTMANAGER_TIMEOUT=10s karma
karma --alertmanager.timeout 10s
```

### Alertmanager request proxy

To set the `proxy` key from `alertmanager.servers` map `ALERTMANAGER_PROXY`
env or `--alertmanager.proxy` flag can be used.
Examples:

```shell
ALERTMANAGER_PROXY=true karma
karma --alertmanager.proxy
```
