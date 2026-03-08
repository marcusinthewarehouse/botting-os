---
name: test
description: Run BottingOS test suite - type check, unit tests, build check
context: fork
allowed-tools: Bash(npx *), Bash(npm *)
---

Run the full test suite for BottingOS:

## Current state

- Changed files: !`cd /Users/marcushooshmand/Documents/Claude/bottingos && git diff HEAD --name-only`
- Test files: !`find /Users/marcushooshmand/Documents/Claude/bottingos/src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -20`

## Steps

1. cd /Users/marcushooshmand/Documents/Claude/bottingos
2. Type check: npx tsc --noEmit
3. Unit tests: npx vitest run (skip if no test files)
4. Build: npm run build

Report: PASS/FAIL per step with specific error messages on failure.
