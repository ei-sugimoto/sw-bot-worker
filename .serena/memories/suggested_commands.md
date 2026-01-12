# Suggested Commands

## Development
```bash
# Start development server with scheduled trigger testing enabled
npm run dev

# Or equivalently
npm run start
```

## Testing Scheduled Handler
```bash
# After starting dev server, test the scheduled handler with:
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Type Generation
```bash
# Regenerate types for worker bindings (after modifying wrangler.jsonc)
npm run cf-typegen
```

## System Utilities (macOS/Darwin)
```bash
# Git operations
git status
git add .
git commit -m "message"
git push

# File operations
ls -la
find . -name "*.ts"
grep -r "pattern" .
```

## Wrangler Commands
```bash
# View logs from deployed worker
npx wrangler tail

# Check worker status
npx wrangler whoami
```
