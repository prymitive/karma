# Changelog

## [Unreleased]

### Fixed

- Not all labels were stripped when using `lables:keep` or `labels:strip`
  option #2585.

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
            alerts:
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
