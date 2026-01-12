# Project Overview

## Purpose
sw-bot-worker is a Cloudflare Workers project that runs as a scheduled (cron) worker. It executes tasks at regular intervals (every minute by default).

## Tech Stack
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Build Tool**: Wrangler (Cloudflare's CLI)
- **Package Manager**: npm

## Key Files
- `src/index.ts` - Main entry point with fetch and scheduled handlers
- `wrangler.jsonc` - Cloudflare Workers configuration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `worker-configuration.d.ts` - Type definitions for worker bindings

## Architecture
This is a scheduled worker that:
1. Runs on a cron schedule (currently every minute)
2. Can also respond to HTTP requests for testing
3. Uses the `ExportedHandler<Env>` interface for type-safe handlers
