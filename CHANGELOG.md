# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2024-04-30

### Added

- Add method `sendIpc` for inter-process communication

## [1.0.2] - 2024-04-29

- Adds support for periodic refresh of tokens through the metod .refreshApiToken().

## [1.0.1] - 2024-04-25

### Added

- Add optional constructor parameter `eventStream` defaulting to false. Add
  `.on()` and `.off()` for subscribing to pup events through WebSocketStreams if
  eventStream is enabled.

## [1.0.0] - 2024-04-23

### Added

- Initial release of @pup/api-client

### Changed

Nothing.

### Removed

Nothing.
