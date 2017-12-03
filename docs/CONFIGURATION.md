# Configuration options

## Config file

### Alertmanagers

`alertmanager` section allows setting Alertmanager servers that should be
queried for alerts.
You can configure one or more Alertmanager servers, alerts
with identical label set will be deduplicated and labeld with each Alertmanager
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
* `timeout` - timeout for requests send to this Alertmanager server, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format.

Example:

```yaml
alertmanager:
  interval: 1m
  servers:
    - name: production1
      uri: https://alertmanager1.prod.example.com
      timeout: 20s
    - name: production2
      uri: https://alertmanager2.prod.example.com
      timeout: 20s
    - name: staging
      uri: https://alertmanager.staging.example.com
      timeout: 30s
```

Defaults:

```yaml
alertmanager:
  interval: 1m
  servers: []
```

There is no default for `alertmanager.servers` and it's a required option.

### Annotations

`annotations` section allows configuring how alert annotation are displyed in
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

### Colors

`colors` section allows configuring which labels should have colors applied
to label background in the UI. Colors can help visually identify alerts
with shared labels, for example coloring hostname label will allow to quickly
spot all alerts for the same host.
Syntax:

```yaml
colors:
  labels:
    static: list of strings
    unique: list of strings
```

* `static` - list of label names that will all have the same color applied
  (different than the default label color). This allows to quickly spot a
  specific label that can have high range of values, but it's important when
  reading the dashboard. For example coloring the instance label allows to
  quickly learn which instance is affected by given alert.
* `unique` - list of label names that should have unique colors generated in
  the UI.

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

Defaults:

```yaml
colors:
  labels:
    static: []
    unique: []
```

### Debug

`debug` key allows enabling [gin](https://github.com/gin-gonic/gin) debug mode.
It will also configure to print out more debugging information on startup and
enable [https://golang.org/pkg/net/http/pprof/](pprof) debug paths.
Syntax:

```yaml
debug: bool
```

Defaults:

```yaml
debug: false
```

### Filters

`filters` section allows configuring default set of filters used in the UI.

Syntax:

```yaml
filters:
  default: list of strings
```

* `default` - list of filters to use by default when user navigates to unsee
  web UI. Visit `/help` page in unsee for details on avaiable filters.
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

`labels` section allows configuring which alert labels will be rendered in the
UI. All labels will be parsed when collecting alerts from Alertmanager API and
used when deduplicating alerts, this section is only used to UI rendering and
should be used to remove those alerts that are not useful to users.
Syntax:

```yaml
labels:
  keep: list of strings
  strip: list of strings
```

* `keep` - list of allowed labels, if empty all labels are allowed.
* `strip` - list of ignored labels.

Example where `task_id` label is ignored by unsee:

```yaml
labels:
  keep: []
  strip:
    - task_id
```

Example where all but `instance` and `alertname` labels are alowed:

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
  keep: []
  strip: []
```

### Listen

`listen` section allows configuring unsee web server behaviour.
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

Example where unsee would listen for HTTP requests on http://1.2.3.4:80/unsee/

```yaml
listen:
  address: 1.2.3.4
  port: 80
  prefix: /unsee/
```

Defaults:

```yaml
listen:
  address: "*"
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
to https://jira.example.com/browse/DEVOPS-123.

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
Exaceptions:

* `alertmanager.servers` - this config files option is a list of maps, to
  configure multiple Alertmanager servers config file needs to be used.
  It's possible to pass a single Alertmanager server URI using
  `--alertmanager.uri` flag or `ALERTMANAGER_URI` environment variable. If this
  flag/env is used name of the Alertmanager instance will be always `default`
  and the timeout will be set to `40s`, customizing those two options requires
  config file.
* `jira` - this option is a list of maps and it's only avaiable when using
  config file.

## Environment variables

Environment variables are mapped in a similiar way as command line flags,
`alertmanager:interval` is accessible as `ALERTMANAGER_INTERVAL` env.
Same exceptions apply as with command line flags.

* `HOST` - used by gin webserver, same effect as setting `listen:address` config
  option
* `PORT` - used by gin webserver, same effect as setting `listen:port` config
  option
* `SENTRY_DSN` - is used by Sentry itself, same effect as passing value to
  `sentry:private` config option.
