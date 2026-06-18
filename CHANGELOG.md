# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Vite + Solid + TypeScript scaffold.
- PWA shell via `vite-plugin-pwa` with web app manifest and basic service worker.
- Structured debug logger (`src/debug.ts`) with category-based thresholds, console sink, in-memory ring buffer, and JSON dump download.
- IndexedDB test setup (`fake-indexeddb`) wired into Vitest.
