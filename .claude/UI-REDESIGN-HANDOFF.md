# UI Redesign Handoff

## Context

All 8 phases of BottingOS are COMPLETE (204 tests, 15 routes, TSC clean, Rust builds clean).
Cloudflare Worker deployed: https://bottingos-webhook-proxy.bottingos.workers.dev

## Why This File Exists

The UI was built mechanically following the original spec (zinc-950 black, amber accent) without
using design skills. User wants a full redesign to feel premium and Apple-clean.

## Design Direction (LOCKED IN - do not change without user input)

### Colors

- Light mode bg: `#F0F5FA` (very light blue-gray)
- Light mode cards: `#FFFFFF`
- Light mode text: `#0F172A`
- Dark mode bg: `#23272F` (warm dark gray, lighter than terminal)
- Dark mode cards: `#2C313C`
- Dark mode text: `#F8FAFC`
- Accent light: `#7C3AED` (violet)
- Accent dark: `#A78BFA` (soft violet)
- Success: `#16A34A`
- Warning: `#D97706`
- Danger: `#DC2626`

### Typography

- Font: Outfit (NOT Inter, NOT Arial, NOT system fonts)

### Feel

- Apple-clean minimal premium
- Light mode is DEFAULT, user can toggle to dark
- NOT vibe-coded - every spacing and color decision must be intentional

## Skills Available (active after restart)

- `/playground` - use to build interactive HTML mockup FIRST before touching app code
- `/frontend-design` - use for implementation guidance on every UI task
- Both copied to: `.claude/skills/`

## Next Steps

1. Open Claude from `/Users/marcushooshmand/Documents/Claude/bottingos/`
2. Verify `/playground` and `/frontend-design` are available
3. Use `/playground` to build HTML mockup of dashboard (sidebar + KPI cards + table)
4. Get user approval on mockup
5. Apply design system to all pages - replace zinc/amber theme throughout
6. Key files to retheme: `src/app/globals.css`, `tailwind.config.ts`, all page components
