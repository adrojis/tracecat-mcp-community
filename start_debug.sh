#!/bin/bash
# Debug script for MCP server — loads credentials from .env
# DO NOT hardcode credentials in this file.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables from .env
set -a
source "$SCRIPT_DIR/.env"
set +a

exec node --import tsx src/index.ts 2>>"$SCRIPT_DIR/mcp_debug.log"
