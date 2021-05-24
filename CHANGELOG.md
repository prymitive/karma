# Changelog

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
