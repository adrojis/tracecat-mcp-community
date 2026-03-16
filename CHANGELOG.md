# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-15

### Added

- Initial public release with **49 MCP tools** across 12 domains
- Published on [npm](https://www.npmjs.com/package/tracecat-mcp-community) — install with `npx tracecat-mcp-community`
- **Workflows** — list, create, get, update, deploy, export, delete, validate, autofix
- **Actions** — CRUD with YAML input support
- **Executions** — run workflows, list/get/cancel executions, compact view
- **Cases** — full case management with comments
- **Secrets** — search, create, get, update, delete
- **Tables** — tables, columns, and rows (including batch insert)
- **Graph** — add edges, move nodes, update trigger position
- **Schedules** — cron/interval scheduling
- **Webhooks** — API key generation/rotation
- **Docs** — search Tracecat documentation
- **Templates** — 7 community workflow templates (CrowdSec, Wazuh, CrowdStrike, VirusTotal, phishing response, SIEM triage)
- **System** — health check
- Lazy authentication with session cookies
- Auto workspace detection
- Docker support (multi-stage build)
- CI/CD with GitHub Actions (build, test, automated npm/Docker release)
- Companion [tracecat-skills](https://github.com/adrojis/tracecat-skills) — 12 Claude Code skills
