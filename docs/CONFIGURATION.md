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

### Authentication

`authentication` sections allows enabling authentication support in karma.
When set users will be required to authenticate when trying to access karma.
There are currently two supported authentication methods:

- [Basic HTTP Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#Basic_authentication_scheme).
  Karma will be performing authentication using configured list of username &
  password pairs. This method is only recommended for testing.
- External authentication via headers. Karma doesn't perform any authentication
  itself, it is done by a frontend service (SSO or nginx reverse proxy) that
  sets a header with username on every request.

Only one method can be enabled in the config.
Enabling authentication will also force silences to be created with usernames
passed from credentials.
Syntax:

```YAML
authentication:
  header:
    name: string
    value_re: regex
  basicAuth:
    users:
      - username: string
        password: string
```

- `authentication:users:header:name` - name of the header that will contain the
  username. If this header is missing from a request access will be forbidden.
  When set header authentication is used.
- `authentication:users:header:value_re` -
  [regex](https://golang.org/s/re2syntax) used to extract the username from the
  request header value (when `authentication:users:header:name` is set).
  It must include one numbered capturing group, whatever is matched by that
  group will be used as the silence form author field.
  All regexes are anchored.
  This option must be set when `authentication:users:header:name` is set.
- `authentication:users` - list of users (username & password) allowed to login.
  Passwords are stored plain without any encryption.
  When set HTTP basic authentication will be used.

Defaults:

```YAML
authentication:
  header:
    name: ""
    value_re: ""
  basicAuth:
    users: []
```

Example where HTTP Basic Authentication will be used with a list of username
and password pairs set in karma config file.

```YAML
authentication:
  basicAuth:
    users:
      - username: alice
        password: secret
      - username: bob
        password: moreSecret
```

Example where the `X-Auth` header will be used for authentication, raw header
value will be used as username.

```YAML
authentication:
  header:
    name: X-Auth
    value_re: ^(.+)$
```

### Authorization

`authorization` section allows to configure authorization groups used in
silence ACL rules.
Syntax:

```YAML
authorization:
  acl:
    silences: string
  groups:
    - name: string
      members: list of strings
```

- `acl:silences` - path to silence ACL configuration file, see
  [ACLs](/docs/ACLs.md) for details
- `groups` - list of group definitons, each group must have a `name` and
  `members` list. `name` will be used in silence ACL rules, `members` list
  should contain list of user names as passed from authentication layer.

Example with two groups using basic auth users and silences ACL config:

```YAML
authentication:
  basicAuth:
    users:
      - username: alice
        password: secret
      - username: bob
        password: secret
      - username: john
        password: secret
authorization:
  acls:
    silences: /etc/karma/acls.yaml
  groups:
    - name: admins
      members:
        - alice
        - bob
    - name: users
      members:
        - john
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
      cluster: string
      uri: string
      external_uri: string
      timeout: duration
      proxy: bool
      readonly: bool
      tls:
        ca: string
        cert: string
        key: string
        insecureSkipVerify: bool
      proxy_url: string
      headers:
        any: string
      cors:
        credentials: string
      healthcheck:
        visible: bool
        filters: map (string: list of strings)
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
- `cluster` - this option can be set to give
  [Alertmanager clusters](https://prometheus.io/docs/alerting/latest/alertmanager/#high-availability)
  custom names in the UI. If there are multiple alertmanager servers configured
  in karma config that are part of the same HA cluster then this option should
  be set to the same value for all of them. If `cluster` option isn't set a name
  will be generated for each detected cluster.
- `uri` - base URI of this Alertmanager server. Supported URI schemes are
  `http://` and `https://`.
  If URI contains basic auth info
  (`https://user:password@alertmanager.example.com`) and you don't want it to
  be visible to users then ensure `proxy: true` is also set in order to avoid
  leaking auth information to the browser.
  Note: if URI contains username and password and proxy option is NOT enabled
  (see below), then the username & password information will be stripped from
  the URI and `Authorization` header using Basic Auth will be set for all
  in browser requests.
- `external_uri` - this option allows to override base URI of this Alertmanager
  used for browser links and also silence requests (but only when proxy mode is
  not enabled).
- `timeout` - timeout for requests send to this Alertmanager server, a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format.
- `proxy` - if enabled requests from user browsers to this Alertmanager will be
  proxied via karma. This applies to requests made when managing silences via
  karma (creating or expiring silences).
  This option cannot be used when `readonly` is enabled.
- `readonly` - set this Alertmanager upstream to a read only mode. This will
  disallow silence creation or editing.
  This option cannot be used when `proxy` is enabled.
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
- `proxy_url` - sets a proxy for HTTP client used for making requests to the
  upstream server. This can be used to access servers available via SOCKS5
  proxy.
- `headers` - a map with a list of key: values which are header: value.
  These custom headers will be sent with every request to the alert manager
  instance.
- `cors:credentials` - sets the
  [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) credentials
  settings for browser requests,
  [see docs](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)
  for the list of possible values.
  By default credentials are included in all requests (`include`), set it to
  `omit` or `same-origin` if Alertmanager is configured to respond with
  `Access-Control-Allow-Origin: *`,
  [see docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials).
- `healthcheck:visible` - enable this option if you want `healthcheck:filters`
  alerts to be visible in karma UI. An alternative to enabling this option is to
  route healcheck alerts to alertmanager receiver that isn't visible using default
  karma filters.
- `healthcheck:filters` - define healtchecks using alert filters. When set karma
  will search for alerts matching defined filters and show an error if it doesn't
  match anything. This can be used with a [Dead man's switch](https://en.wikipedia.org/wiki/Dead_man%27s_switch)
  style alert to notify karma users that there's a problem with alerting pipeline.
  Syntax for this option is a map where key is the name of the filter set (used in
  the UI when showing errors) and the value is a list of filters.

  Example:

  - Setup always on alert in each Prometheus server (prom1 and prom2):

    ```YAML
    - alert: DeadMansSwitch
      expr: vector(1)
    ```

  - Add healtcheck configuration to karma:

    ```YAML
    alertmanager:
      servers:
        - name: am
          uri: https://alertmanager.example.com
          healthcheck:
            filters:
              prom1:
                - alertname=DeadMansSwitch
                - instance=prom1
              prom2:
                - alertname=DeadMansSwitch
                - instance=prom2
    ```

  If any of these alerts is missing from alertmanager karma will show a warning
  in the UI.

Note: there are multiple supported combination of URI settings which result in
a slightly different behavior. Settings that control it are:

- `uri` - this option tells karma backend the URI that should be used to collect
  all alerts and silence data from given Alertmanager instance. This setting is
  required.
- `proxy` - this option when set to true enables karma backend to proxy all
  silence management requests (creating, editing or deleting silences via karma
  UI), so when the user creates a silence via karma UI the browser makes a
  request to karma backend, the backend then forwards this request to the
  Alertmanager using the value of `uri` option as the URI.
  When this option is set to `false` all browser requests will use `uri` value.
  This setting is optional, default value for it is `false`.
- `external_uri` - this option tells karma how the browser should connect to
  given Alertmanager instance, it can be used for silence management requests
  (creating, editing or deleting silences via karma UI) and how to generate
  links to silences in Alertmanager web UI. Behavior of this option depends on
  the value of `proxy` setting.
  When proxy mode is enabled:
  - silence management requests will use karma backend URI
  - silence links to Alertmanager web UI will use `external_uri` value as base
    URI
    When proxy mode is disabled:
  - silence management requests will use `external_uri` value as base URI
  - silence links to Alertmanager web UI will use `external_uri` value as base
    URI

Breakdown of all combination of settings:

1. Only `uri` is set:

   ```YAML
   uri: http://localhost:123
   ```

   Karma would use those URIs for:

   | Backend                | Silence management     | Silence links          |
   | ---------------------- | ---------------------- | ---------------------- |
   | `http://localhost:123` | `http://localhost:123` | `http://localhost:123` |

1. Proxy mode is enabled:

   ```YAML
   uri: http://localhost:123
   proxy: true
   ```

   Karma would use those URIs for:

   | Backend                | Silence management | Silence links          |
   | ---------------------- | ------------------ | ---------------------- |
   | `http://localhost:123` | Karma internal URI | `http://localhost:123` |

1. `external_uri` is set, but proxy mode is disabled:

   ```YAML
   uri: http://localhost:123
   external_uri: http://example.com
   ```

   Karma would use those URIs for:

   | Backend                | Silence management   | Silence links        |
   | ---------------------- | -------------------- | -------------------- |
   | `http://localhost:123` | `http://example.com` | `http://example.com` |

1. Proxy mode is enabled and `external_uri` is set:

   ```YAML
   uri: http://localhost:123
   proxy: true
   external_uri: http://example.com
   ```

   Karma would use those URIs for:

   | Backend                | Silence management | Silence links        |
   | ---------------------- | ------------------ | -------------------- |
   | `http://localhost:123` | Karma internal URI | `http://example.com` |

1. ReadOnly mode is enabled:

```YAML
uri: http://localhost:123
readonly: true
```

Karma would use those URIs for:

| Backend                | Silence management | Silence links          |
| ---------------------- | ------------------ | ---------------------- |
| `http://localhost:123` | Disabled           | `http://localhost:123` |

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
    - name: socks5
      uri: https://internal.address
      proxy_url: socks5://proxy.local:5000
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

### Alert acknowledgement

Prometheus Alertmanager allows alerts to be in 3 states:

- `active` - when alert is firing
- `suppressed` - when alert is either silenced by a
  [silence rule](https://prometheus.io/docs/alerting/alertmanager/#silences) or
  inhibited by another alert using
  [inhibition rules](https://prometheus.io/docs/alerting/alertmanager/#inhibition)
- `unprocessed` - initial state for new alerts before they are checked against
  all silence rules so Alertmanager doesn't yet know if the alert should be
  `active` or `suppressed`

A silence rule can be used to mark an alert as acknowledged and being worked on.
To simplify creating of such silences karma provides a one click button that
will create a silence matching alert group it was clicked for.
`alertAcknowledgement` allows to enable this feature and customize it's
configuration.
Syntax:

```YAML
alertAcknowledgement:
  enabled: bool
  duration: duration
  author: string
  comment: string
```

- `enabled` - setting it to true will enable creation of short lived
  acknowledgement silences.
- `duration` - duration for acknowledgement silences, value is a string in
  [time.Duration](https://golang.org/pkg/time/#ParseDuration) format.
- `author` - default author for acknowledgement silences. If user set the
  author field on the silence form then that value will be used instead.
- `comment` - custom comment used for acknowledgement silences (optional).
  If the comment contains `%NOW%` it will be replaced by current timestamp.

Defaults:

```YAML
alertAcknowledgement:
  enabled: false
  duration: 15m0s
  author: karma
  comment: ACK! This alert was acknowledged using karma on %NOW%
```

A common problem is setting a correct duration for the silence.
If set for too short it can expire before the issue is resolved, and will
require re-silencing all the alerts.
If set for too long it mask the same problem reoccurring in the future. This
requires user to expire the silence once the issue is resolved.

[kthxbye](https://github.com/prymitive/kthxbye) is a tiny daemon that can help
with managing short lived acknowledged silences. It will continuously extend
short lived acknowledgement silences if there are alerts firing against those
silences, which means that the user doesn't need to worry about setting proper
duration for such silences.
To use it run an instance of kthxbye with every alertmanager instance or
cluster and configure it to use the same comment prefix in `comment`.
With this setup when user clicks to acknowledge an alert karma will create
a short lived silence and kthxbye will keep that silence in Alertmanager
until there are no alerts matching it, meaning that the issue was resolved.

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
  order: list of strings
  actions: list of strings
  enableInsecureHTML: bool
```

- `default:hidden` - bool, true if all annotations should be hidden by default.
- `hidden` - list of annotations that should be hidden by default.
- `visible` - list of annotations that should be visible by default when
  `default:hidden` is set to `true`.
- `keep` - list of allowed annotations, if empty all annotations are allowed.
- `strip` - list of ignored annotations.
- `order` - custom order of annotation names. All annotations listed here will
  appear first in the order specified here. Remaining annotations will be sorted
  alphabetically and appended at the end.
- `actions` - list of annotations that will be moved to alert dropdown menu.
  this only applies to annotations where value is a link.
- `enableInsecureHTML` - by default all annotation values are escaped when
  rendered in users browser, to prevent any injection attacks.
  If this option is set to `true` escaping will be disabled which allows
  HTML tags to be used in annotations, but if someone manages to send alerts
  with annotations containing untrusted HTML/Javascript code to your alertmanager
  instances karma will allow it to be executed in your browser.

  **NOTE** Enable at your own risk.

The difference between `hidden`/`visible` and `keep`/`strip` is that hidden
annotations are still accessible, but they are shown in the UI collapsed by
default (only name is visible, value is shown after clicking), while stripped
annotations are removed entirely and never presented to the user.

Example where all annotations except `summary` are hidden by default. If there
are additional annotation keys user will need to click on the `+` icon to see
them. `summary` annotation will always appear first in the UI, followed by
`help` and all other annotations (sorted alphabetically). Any annotation with
name `jira` and a value that is a URL will be moved to alerts dropdown menu.

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
  order:
    - summary
    - help
  actions:
    - jira
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
  keep: []
  strip: []
  order: []
  actions: []
  enableInsecureHTML: false
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
  auto:
    ignore: list of strings
    order: list of strings
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
- `auto:ignore` - list of label names that should never be selected as multi-grid
  source label when multi-grid is configured to `Automatic selection` in the UI
  or when `ui:multiGridLabel` is set to `@auto`.
- `auto:order` - preferred order for selecting labels to be used as multi-grid
  source label when multi-grid is configured to `Automatic selection` in the UI
  or when `ui:multiGridLabel` is set to `@auto`. If a label name is not present
  in this list labels with equal weight will be picked in alphabetic order.

Defaults:

```YAML
grid:
  sorting:
    order: startsAt
    reverse: true
    label: alertname
    customValues:
      labels: {}
  auto:
    ignore: []
    order: []
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

### Alert history

`history` section allows to enable and configure alert history queries.
When enabled karma will use `source` fields to try finding remote
Prometheus servers sending alerts. If `source` is a link that points at
a reachable Prometheus server then karma will query its metrics to estimate
how many times did that alert fire in the last 24h.

Syntax:

```YAML
history:
  enabled: bool
  timeout: duration
  workers: integer
  rewrite:
    - source: regex
      uri: string
```

- `enabled` - enable alert history UI and backend query support
- `timeout` - timeout for HTTP requests send to remote Prometheus servers
- `workers` - number of worker threads to start, each worker handles
  one outgoing HTTP request, more workers allows to handle more concurrent
  queries if you have a large number of Prometheus servers sending alerts
- `rewrite` - list of source rewrite rules applied before any request is send
  to remote Prometheus. Rewrite rules can be used to modify URI used by karma
  when connecting to Prometheus API if `source` field in alert uses addresses
  not reachable from karma.
  All regexes are anchored, `${N}` syntax can be used for capture groups.
  You can rewrite uri to an empty string to disable connecting to that
  specific Prometheus instance.

Defaults:

```YAML
history:
  enabled: true
  timeout: 20s
  workers: 30
  rewrite: []
```

Example with rewrite rule that will replace `https://prometheus.example.com`
with `http://localhost:9093`:

```YAML
history:
  rewrite:
    - source: 'https://prometheus.example.com'
      uri: 'http://localhost:9093'
```

Example with rewrite rule that will replace `https://*.example.com` with
`http://prometheus-*.internal` (`https://dev.example.com` becomes
`http://prometheus-dev.example.com`):

```YAML
history:
  rewrite:
    - source: 'https://(.+).example.com'
      uri: 'http://prometheus-$1.internal'
```

Example with rewrite rule that will disable sending any history queries to
`http://prometheus.internal`:

```YAML
history:
  rewrite:
    - source: 'http://prometheus.internal'
      uri: ''
```

### Karma

`karma` section allows configuring miscellaneous internal options.

Syntax:

```YAML
karma:
  name: string
```

- `name` - name of given karma instance, this is currently used for the browser
  tab title.

Defaults:

```YAML
karma:
  name: karma
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
          value_re: regex
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
    [regular expression](https://golang.org/pkg/regexp/) to match against.
    All regexes will be automatically anchored.
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
  timeout:
    read: duration
    write: duration
  prefix: string
  tls:
    cert: string
    key: string
```

- `address` - Hostname or IP to listen on.
- `port` - HTTP port to listen on.
- `timeout:read` - HTTP server request read timeout
- `timeout:write` - HTTP server response write timeout
- `prefix` - URL root for karma, you can use to if you wish to serve it from
  location other than `/`. This option is mostly useful when using karma behind
  reverse proxy with other services on the same IP but different URL root.
- `tls:cert` - path to a TLS certificate, enables listening on HTTPS instead of HTTP,
- `tls:key` - path to a TLS key, required when `tls.cert` is set

Example where karma would listen for HTTP requests on `http://1.2.3.4:80/karma/`

```YAML
listen:
  address: 1.2.3.4
  port: 80
  prefix: /karma/
```

Example where karma would listen for HTTPS requests on `https://1.2.3.4:443/`

```YAML
listen:
  address: 1.2.3.4
  port: 443
  tls:
    cert: server.pem
    key: server.key
```

Defaults:

```YAML
listen:
  address: "0.0.0.0"
  port: 8080
  prefix: /
  tls:
    cert: ""
    key: ""
```

### Log

`log` section allows configuring logging subsystem.
Syntax:

```YAML
log:
  config: bool
  level: string
  format: string
  requests: bool
  timestamp: bool
```

- `config` - if set to `true` karma will log used configuration on startup
- `level` - log level to set for karma, possible values are `debug`, `info`,
  `warning`, `error`, `fatal` and `panic`.
- `format` - controls how log messages are formatted, possible values are
  `text` and `json`. If set to `json` each log will be a JSON object
- `requests` - if set to `true` karma will log all requests
- `timestamp` - if set to `true` all log messages will include a timestamp

Defaults:

```YAML
log:
  config: false
  level: info
  format: text
  requests: false
  timestamp: false
```

### Silences

`silences` section allows specifying to configure silence post post-processing.
Syntax:

```YAML
silences:
  comments:
    linkDetect:
      rules: list of link detection rules
```

- `comments:linkDetect:rules` allows to specify a list of rules to detect links
  inside silence comments. It's intended to find ticket system ID strings and
  turn them into links.
  Each rule must specify:
  - `regex` - regular expression that matches ticket system IDs. Each regex must
    contain at least one capture group `(regex)`. All regexes will be
    automatically anchored.
  - `uriTemplate` - template string that will be used to generate a link.
    Each template must include `$1` which will be replaced with text matched
    by the `regex`.

Example where a string `DEVOPS-123` inside a comment would be rendered as a link
to a JIRA ticket `https://jira.example.com/browse/DEVOPS-123`.

```YAML
silences:
  comments:
    linkDetect:
      rules:
        - regex: "(DEVOPS-[0-9]+)"
          uriTemplate: https://jira.example.com/browse/$1
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

`silenceForm` section allows customizing silence form behavior.

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

Example where `job` label won't be auto populated in the silence form.

```YAML
silenceForm:
  strip:
    labels:
      - job
```

## UI defaults

`ui` section allows configuring default values for UI settings controled via the
configuration modal. Those defaults can be overwritten by use via UI controls.

Syntax:

```YAML
ui:
  refresh: duration
  hideFiltersWhenIdle: bool
  colorTitlebar: bool
  theme: string
  animations: bool
  minimalGroupWidth: integer
  alertsPerGroup: integer
  collapseGroups: string
  multiGridLabel: string
  multiGridSortReverse: bool
```

- `refresh` - default refresh interval, this tells the UI how often karma API
  should be queried
- `hideFiltersWhenIdle` - if enabled filter bar will be hidden after some
  user inactivity
- `colorTitlebar` - if enabled alert group title bar color will be set to follow
  alerts in that group
- `theme` - default theme, possible values:

  - `light` - bright theme
  - `dark` - dark theme
  - `auto` - follows browser preferences using
    [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
    media queries

  Default value is `auto`.

- `animations` - enables UI animations
- `minimalGroupWidth` - minimal width (in pixels) for each alert group rendered
  on the grid. This value is used to calculate the number of columns rendered on
  the grid.
- `alertsPerGroup` - default number of alerts to show for each group
- `collapseGroups` - controls if alert groups will default to being rendered
  expanded or collapsed (only title bar is visible). Valid values:
  - expanded - groups are always expanded
  - collapsed - groups are always collapsed
  - collapsedOnMobile - groups are expanded on desktop and collapsed on mobile
    browsers
- `multiGridLabel` - when set to a label name it enables multi-grid support.
  With multi-grid karma will have a dedicated grid for each value of this label,
  all alerts sharing that value will be placed on the same grid. There will be
  extra grid for alerts without that label. Grid sorting options will be used
  to sort the list of grids.
  This option accepts additional special values:
  - `@auto` - grid label will be selected automatically
  - `@alertmanager` - one grid per alertmanager configured in karma config
  - `@cluster` - one grid per alertmanager cluster
  - `@receiver` - one grid per alertmanager receiver
- `multiGridSortReverse` - when multi-grid is enabled set to `true` the order
  in which grids are displayed.

Defaults:

```YAML
ui:
  refresh: 30s
  hideFiltersWhenIdle: true
  colorTitlebar: false
  theme: "auto"
  animations: true
  minimalGroupWidth: 420
  alertsPerGroup: 5
  collapseGroups: collapsedOnMobile
  multiGridLabel: ""
  multiGridSortReverse: false
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

### Alertmanager external URI

To set the `external_uri` key from `alertmanager.servers` map
`ALERTMANAGER_EXTERNAL_URI` env or `--alertmanager.external_uri` flag can be
used.
Examples:

```shell
ALERTMANAGER_EXTERNAL_URI=https://alertmanager.example.com karma
karma --alertmanager.external_uri https://alertmanager.example.com
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
