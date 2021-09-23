# Changelog

## [unreleased]

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
