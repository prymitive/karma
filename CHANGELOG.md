# Changelog

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
