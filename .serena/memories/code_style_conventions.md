# Code Style and Conventions

## Formatting (Prettier)
- **Print Width**: 140 characters
- **Quotes**: Single quotes (`'`)
- **Semicolons**: Required
- **Indentation**: Tabs

## Editor Config
- **Indent Style**: Tabs (spaces for YAML files)
- **Line Endings**: LF (Unix-style)
- **Charset**: UTF-8
- **Trailing Whitespace**: Trimmed
- **Final Newline**: Required

## TypeScript Configuration
- **Target**: ES2024
- **Module**: ES2022
- **Strict Mode**: Enabled
- **No Emit**: True (Wrangler handles bundling)
- **JSX**: react-jsx (available if needed)

## Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for types and interfaces
- Use UPPER_SNAKE_CASE for constants

## Type Annotations
- Strict mode is enabled, so type annotations are expected
- Use `satisfies` keyword for type-safe exports (e.g., `satisfies ExportedHandler<Env>`)
- Worker bindings are typed in `worker-configuration.d.ts`
