# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in tracecat-mcp-community, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email **security concerns** via GitHub private vulnerability reporting: [Report a vulnerability](https://github.com/adrojis/tracecat-mcp-community/security/advisories/new)

We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Credential Safety

This project requires Tracecat credentials to function. We take the following precautions:

- Credentials are loaded exclusively from `.env` files via [dotenv](https://github.com/motdotla/dotenv)
- `.env` is gitignored and never committed to version control
- No credentials are hardcoded in source files
- Session cookies are held in memory only and never persisted to disk
- The MCP server communicates with your Tracecat instance over your local network — no data is sent to third parties

## Best Practices for Users

- Never commit your `.env` file
- Use strong, unique passwords for your Tracecat account
- Run Tracecat behind a reverse proxy with HTTPS in production
- Restrict network access to the Tracecat API to trusted hosts
- Rotate your Tracecat credentials periodically

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | Yes |
