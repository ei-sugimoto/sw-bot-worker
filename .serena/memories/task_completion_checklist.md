# Task Completion Checklist

When completing a task in this project, ensure the following:

## Before Committing
1. **Type Check**: Ensure TypeScript compiles without errors
   - The project uses strict mode, so all types must be satisfied
   
2. **Code Formatting**: Format with Prettier settings
   - Single quotes, tabs, semicolons, 140 char width

3. **Test Locally**: 
   ```bash
   npm run dev
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```

## After Modifying Bindings
If you modify environment bindings in `wrangler.jsonc`:
```bash
npm run cf-typegen
```
This regenerates `worker-configuration.d.ts` with updated types.

## Deployment
After confirming changes work locally:
```bash
npm run deploy
```

## Notes
- No explicit test framework is currently configured
- No linting tool (ESLint) is currently configured
- Use TypeScript compiler for type checking: `npx tsc --noEmit`
