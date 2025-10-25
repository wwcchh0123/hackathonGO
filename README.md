# Agent for Desktop (Electron + React)

Desktop UI wrapper for Claude Code CLI with MCP support, built using Electron, React, MUI, TypeScript, and Vite.

Features

- Run/stop a configurable CLI (e.g., `claude-code`) with args
- Stream stdout/stderr to the UI in real-time
- Send stdin lines to the running process
- Pick working directory via native dialog
- Provide environment variables (KEY=VALUE per line)
- Persist last-used configuration in localStorage

Development

- Install deps: `npm install`
- Run web + electron in dev: `npm run dev`
- Web-only dev server: `npm run dev:web`
- Electron only: `npm run dev:electron`

Usage

- In the UI, set `CLI command` to your Claude Code CLI entry (e.g., `claude-code` or `npx claude-code`), include `--mcp` args as needed, set working directory, and run.

Notes

- This wrapper simply spawns the CLI via Node’s child_process. Ensure the CLI is installed and accessible in PATH.
- Packaging for production (electron-builder/electron-forge) can be added later.
