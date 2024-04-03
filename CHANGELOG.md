# Changelog

## v0.120

### Changed

- Karma no longer uses alertmanager `api/v2/status` to discover cluster peers.
  It will only rely on `cluster` field configuration options set in karma config
  file.

## v0.119

### Fixed

- `silenceForm.strip.labels` did't strip labels that are in the filter bar #5817.

## v0.118

### Fixed

- Fixed `listen:prefix` handling that was broken in v0.117 - #5623.

## v0.117

### Changed

- Migrated project from Create React App to [Vite](http://vitejs.dev).

## v0.116

### Added

- Added `headers` option to `history:rewrite` config block. This allows to set
  custom headers passed to Prometheus when sending history query requests.

## v0.115

### Fixed

- Improved memory usage.

## v0.114

### Fixed

- Fixed silcen form crashes when `silenceForm:defaultAlertmanagers` config option
  is not set.

## v0.113

### Added

- Added `silenceForm:defaultAlertmanagers` config option - #5086 (@david-caro).

## v0.112

### Fixed

- Upgraded project dependencies.

## v0.111

### Fixed

- Fixed duplicated `@receiver` labels showing both on the alert and in the footer.

## v0.110

### Fixed

- Alert group footer was always hidden when displaying only one alert,
  even if there were shared labels or annotations to display - #4892.

## v0.109

### Added

- Added ability to delete multiple silences from the silence browser modal - #4618.
- Added `build_info` metric - #4764.

### Fixed

- Managing silences for alertmanager instances with `/` in the name was failing.
  This release adds a workaround for it - #4674.

## v0.108

### Fixed

- Fixed CSS glitches on Google Chrome 105.

## v0.107

### Changed

- Don't show fatal error page if configured health checks are failing but
  alertmanager is still showing alerts. A popup message with will still
  be visible.

## v0.106

### Added

- `proxy_url` option for history rewrite rules #4510 (@tolleiv).

### Changed

- Upgraded [Bootstrap](https://getbootstrap.com/) to v5.2.

## v0.105

### Added

- Allow to copy alert payload from alerts dropdown menu #4378.
- Clicking on a label while holding `Shift` will now copy its value
  to clipboard #4378.

### Changed

- Change max value of `alertsPerGroup` to 25 #4420.

## v0.104

### Added

- Added `@inhibited` and `@inhibited_by` filters #4397.

### Changed

- Dropped support for alertmanager older than `0.22.0`.

## v0.103

### Fixed

- Fixed a regression in alert history queries.

## v0.102

### Fixed

- Correctly set filter history.
- Correctly escape label values when quering Prometheus for alert history.

## v0.101

### Fixed

- Don't crash on autocomplete errors.

## v0.100

### Changed

- `silences:expired` option no longer takes alerts age into account.
- Moved silence progress bar to the bottom of the silence block.
- Removed sentry support to reduce application size.
  `sentry:private` and `sentry:public` config options are no longer valid.

## v0.99

### Fixed

- Fixed regexp escaping when editing silences #3936.

### Changed

- Don't render `@cluster` labels if there's only one cluster configured #3994.
- Show `!` on favicon badge if there's any alertmanager upstream with errors #3987.

## v0.98

### Fixed

- Fixed regexp escaping for auto-populated silence matchers #3936.

### Changed

- Upgraded [Font Awesome](https://fontawesome.com/) icons to 6.0

## v0.97

### Fixed

- Fix escaping regex values in when editing silences #3936.
- Fix UI handling of 401 errors #3942.

## v0.96

### Fixed

- Fix escaping regex values in silence form #3936.

## v0.95

### Fixed

- Messages are now logged correctly when both `--log.format=json` and
  `--log.timestamp=true` flags are set #3822.
- Escape label values in silence form #3866.
- Some silenced were showing incorrect alerts count #3909.

### Changed

- Show a placeholder message if no alertmanager server is configured, instead of
  failing to start.

## v0.94

### Added

- `tls` options to `history:rewrite` rules, allowing customising TLS options
  for requests made by karma to Prometheus servers when querying alert
  history, #3707.
- Unsilenced alerts will now show recently expired silences if they are old enough.
  By default silences expired in the last 10 minutes will be shown, this can be
  configured by setting `silences:expired` option or `--silences.expired` flag.
  Setting this value to `5m` will show silences if they expired in the last 5
  minutes but only if the alert started firing at least 5 minutes ago.
- `alertAcknowledgement:comment` will replace `%NOWLOC%` string with a timestamp
  formatted using local time zone, use `%NOW%` for timestamps using `UTC` timezone,
  #3704.

## v0.93

### Fixed

- Toast popup messages didn't respond to clicks.
- Alertmanager with brackets in the name wasn't able to create, edit
  or delete silences #3651.

### Added

- Loading user groups from HTTP headers, #3361 (@supertassu).
- Added `labels:keep_re`, `labels:strip_re` and `labels:valueOnly_re` config
  options #3659 (@aalexk).
- `labels:order` config option to allow customising order of labels #3500.

### Changed

- Refactored internal APIs.
- Overview modal won't show label name for every value to save screen space.
- Retry failed requests when collecting alerts and silences from alertmanager.

## v0.92

### Fixed

- Overview modal could show incorrect counters for `@state` labels.

## v0.91

### Fixed

- Alert history rewrite rule wouldn't work unless they had a `/` suffix in
  `source` field, this is now fixed and rewrite rules works as documented.
- Clicking `Silence this group` could generate duplicated label matchers
  #3509.

## v0.90

### Fixed

- Alert history will now correctly handle Prometheus servers with
  `--web.external-url` containing sub-uri, see
  [#3387](https://github.com/prymitive/karma/issues/3387).
- Alert history queries didn't include grid labels as those got
  removed from alert groups in #3222, this is now fixed.

### Changed

- Reduced CSS bundle size by removing unused CSS rules with
  [PurgeCSS](https://purgecss.com/).
- Upgraded [bootstrap](https://getbootstrap.com/) to 5.1

## v0.89

### Fixed

- API could error if multiple alertmanager upstreams belonging to the
  same cluster were configured, but `cluster` option was unset
  #3372 (@valihanov).

## v0.88

### Added

- Added a dedicated API endpoint for silence previews.
- Added a dedicated API endpoint for overview modal.
- Individual alert details are now lazy-loaded to improve performance
  when dealing with a huge number of alerts per group.
- Added `/version` endpoint returning karma and Go runtime version #3332.
- Added `labels:valueOnly` config option, see #3221.

### Changed

- Refactored internal APIs.
- Grid labels are no longer shown on alert groups #3222.
  To ensure that those labrls are always visible swimlanes are now using
  `position: sticky`.

## v0.87

### Added

- Use [uber-go/automaxprocs](https://github.com/uber-go/automaxprocs)
  to automatically adjust `GOMAXPROCS` to match Linux container CPU quota.
  Runtime value of `GOMAXPROCS` is now exported as a `go_max_procs` metric.
- API will now return only first 40 alert groups by default, the rest can
  be loaded when user clicks on the `Load more` button.
  `grid:groupLimit` config option was added to customise how many groups
  are returned and displayed in the UI by default.

### Changed

- Automatic grid label selection logic was tweaked to avoid splitting
  alert groups.

## v0.86

### Added

- Added support for alertmanager `v0.22.0`
  [negative matchers](https://github.com/prometheus/alertmanager/pull/2434)
  when creating/editing silences and in [ACL rules](/docs/ACLs.md).
- Silence ACL rules no longer default `isRegex` to be `false` for filters
  and matchers, see [ACL rules](/docs/ACLs.md) for updated docs.

### Changed

- Updated [bootstrap](https://getbootstrap.com/) to v5

## v0.85

### Fixed

- History queries were always failing due to wrong Prometheus API usage.
- URI handling for silence requests when proxy is used #3060.

### Added

- Ability to rewrite source URIs for alert history via `history:rewrite`
  config section #3064.

## v0.84

### Added

- Added `grid:auto` config section for fine tuning automatic label selection
  for multi-grid, when multi-grid is configured to `Automatic selection`
  in the UI or when `ui:multiGridLabel` config section is set to `@auto`.
- Added alert history estimation, see [README.md](/README.md#alert-history)
  and [docs/CONFIGURATION.md](/docs/CONFIGURATION.md#alert-history) for details.

### Changed

- karma will no longer fail to start if config file contains multiple alertmanager
  instances with different name but identical URI #3024.
- Minor UI tweaks.

## v0.83

### Added

- Added a new option on the list of labels used for multi-grid.
  When set in the UI to `Automatic selection` selection or `@auto` in
  `ui:multiGridLabel` config option karma will try to select the best
  grid label based on current alerts.

## v0.82

### Fixed

- Header values are now sanitised before logging when `log:config` is
  enabled #2930.
- Fixed a deadlock issue that could cause karma to hang #2944 (@jonaz).

### Added

- `listen:timeout:read` and `listen:timeout:write` config options for
  setting HTTP server request read and response write timeouts.
- `annotations:enableInsecureHTML` config option #2886.

## v0.81

### Fixed

- Fixed a deadlock issue that could cause karma to hang #2888.

### Added

- `annotations:actions` option allowing to move some annotations
  to alert dropdown menu #2596.
- `proxy_url` alertmanager option to use when a proxy sever needs to be
  used for requests from karma to alertmanager API #2903 (@mhrabovcin).

### Changed

- Multi-grid label dropdown will only show label names from visible alerts.

## v0.80

### Added

- Add `/robots.txt` to block search engine crawlers.
- Easily change multi-grid source label via quick access dropdown on the grid
  header.

### Changed

- Reworked how notifications are displayed.

## v0.79

### Fixed

- Not all labels were stripped when using `lables:keep` or `labels:strip`
  option #2585.

### Added

- `healthcheck:visible` alertmanager option to control if healtcheck alerts
  should be visible in the UI #2614.

## v0.78

### Fixed

- Don't reset regex toggle when adding new silence labels #2520

### Added

- Added support for DeadMansSwitch alerts via `healtcheck:alerts` option
  on alertmanager upstream configuration #2512.
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

## v0.77

### Fixed

- Docker images reported version as `dev` #2479.

### Changed

- Alert groups will be rendered with fewer details when idle.

## v0.76

### Fixed

- Fixed release builds using Github Actions

## v0.75

### Fixed

- Fixed auth bypass for `/health` and `/metrics` endpoints.
  Those endpoints should be always excluded from authentication but that was
  broken in `v0.73` #2465.

### Added

- `listen:tls:cert` and `listen:tls:key` config options for listening on HTTPS
  port

### Changed

- ghcr.io/prymitive/karma is now used as the primary repository for docker
  images instead of Docker Hub
- `alertAcknowledgement:commentPrefix` config option was replaced by
  `alertAcknowledgement:comment` that can be used to customise the entire
  comment.
