Build BottingOS for distribution.

1. Run `npx tsc --noEmit` to verify types
2. Run `npx vitest run` to verify tests pass
3. Run `npx tauri build` to produce the desktop app
4. Report the output location of the .dmg (macOS) or .exe (Windows)
