---
name: verify-app
description: End-to-end verification after changes - runs type check, unit tests, and Playwright UI tests
model: inherit
tools: Bash, Read, Glob
maxTurns: 20
---

Run full verification of the BottingOS app:

1. **Type check**: `cd /Users/marcushooshmand/Documents/Claude/bottingos && npx tsc --noEmit`
2. **Unit tests**: `npx vitest run` (if test files exist)
3. **Build check**: `npm run build` (next build for static export)
4. **Playwright UI tests** (if `next dev` is running on port 3000):
   - Navigate to localhost:3000
   - Check each main section loads without console errors
   - Verify key interactions from the last changed task work
5. **Tauri smoke** (if Rust was changed): `npx tauri build --debug` compiles without error

Report pass/fail for each step. On failure, include the exact error message.
