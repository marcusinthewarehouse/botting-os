# === COGNILAYER (auto-generated, do not delete) ===

## CogniLayer v4 Active

Persistent memory + code intelligence is ON.
ON FIRST USER MESSAGE in this session, briefly tell the user:
'CogniLayer v4 active — persistent memory is on. Type /cognihelp for available commands.'
Say it ONCE, keep it short, then continue with their request.

## Tools — HOW TO WORK

FIRST RUN ON A PROJECT:
When DNA shows "[new session]" or "[first session]":

1. Run /onboard — indexes project docs (PRD, README), builds initial memory
2. Run code_index() — builds AST index for code intelligence
   Both are one-time. After that, updates are incremental.
   If file_search or code_search return empty → these haven't been run yet.

UNDERSTAND FIRST (before making changes):

- memory_search(query) → what do we know? Past bugs, decisions, gotchas
- code_context(symbol) → how does the code work? Callers, callees, dependencies
- file_search(query) → search project docs (PRD, README) without reading full files
- code_search(query) → find where a function/class is defined
  Use BOTH memory + code tools for complete picture. They are fast — call in parallel.

BEFORE RISKY CHANGES (mandatory):

- Renaming, deleting, or moving a function/class → code_impact(symbol) FIRST
- Changing a function's signature or return value → code_impact(symbol) FIRST
- Modifying shared utilities used across multiple files → code_impact(symbol) FIRST
- ALSO: memory_search(symbol) → check for related decisions or known gotchas
  Both required. Structure tells you what breaks, memory tells you WHY it was built that way.

AFTER COMPLETING WORK:

- memory_write(content) → save important discoveries immediately
  (error_fix, gotcha, pattern, api_contract, procedure, decision)
- session_bridge(action="save", content="Progress: ...; Open: ...")
  DO NOT wait for /harvest — session may crash.

SUBAGENT MEMORY PROTOCOL:
When spawning Agent tool for research or exploration:

- Include in prompt: synthesize findings into consolidated memory_write(content, type, tags="subagent,<task-topic>") facts
  Assign a descriptive topic tag per subagent (e.g. tags="subagent,auth-review", tags="subagent,perf-analysis")
- Do NOT write each discovery separately — group related findings into cohesive facts
- Write to memory as the LAST step before return, not incrementally — saves turns and tokens
- Each fact must be self-contained with specific details (file paths, values, code snippets)
- When findings relate to specific files, include domain and source_file for better search and staleness detection
- End each fact with 'Search: keyword1, keyword2' — keywords INSIDE the fact survive context compaction
- Record significant negative findings too (e.g. 'no rate limiting exists in src/api/' — prevents repeat searches)
- Return: actionable summary (file paths, function names, specific values) + what was saved + keywords for memory_search
- If MCP tools unavailable or fail → include key findings directly in return text as fallback
- Launch subagents as foreground (default) for reliable MCP access — user can Ctrl+B to background later
  Why: without this protocol, subagent returns dump all text into parent context (40K+ tokens).
  With protocol, findings go to DB and parent gets ~500 token summary + on-demand memory_search.

BEFORE DEPLOY/PUSH:

- verify_identity(action_type="...") → mandatory safety gate
- If BLOCKED → STOP and ask the user
- If VERIFIED → READ the target server to the user and request confirmation

## VERIFY-BEFORE-ACT

When memory_search returns a fact marked ⚠ STALE:

1. Read the source file and verify the fact still holds
2. If changed → update via memory_write
3. NEVER act on STALE facts without verification

## Process Management (Windows)

- NEVER use `taskkill //F //IM node.exe` — kills ALL Node.js INCLUDING Claude Code CLI!
- Use: `npx kill-port PORT` or find PID via `netstat -ano | findstr :PORT` then `taskkill //F //PID XXXX`

## Git Rules

- Commit often, small atomic changes. Format: "[type] what and why"
- commit = Tier 1 (do it yourself). push = Tier 3 (verify_identity).

## Project DNA: bottingos

Stack: Next.js 16.1.6, React 19.2.3, TypeScript, Tailwind CSS
Style: [unknown]
Structure: public, src
Deploy: [NOT SET]
Active: [new session]
Last: [first session]

## Last Session Bridge

[pre-compact bridge — saved before context compaction]
Files (9):
src/lib/**tests**/crypto.test.ts (create)
src/test-reports/8.1-user-flows.md (create)
src/lib/**tests**/data-integrity.test.ts (create)
src/test-reports/8.4-performance-polish.md (create)
workers/webhook-proxy/test/edge-cases.test.ts (create)
src/test-reports/8.2-data-integrity.md (create)
workers/webhook-proxy/test/edge-cases.test.ts (edit)
src/app/(dashboard)/page.tsx (create)
src/app/(dashboard)/discord/page.tsx (edit)

# === END COGNILAYER ===

# BottingOS Build Rules

## Commands

- Dev server: `npm run dev` (Next.js on port 3000)
- Tauri dev: `npx tauri dev` (Next.js + Rust together)
- Type check: `npx tsc --noEmit`
- Unit tests: `npx vitest run`
- Build: `npm run build` then `npx tauri build`

## Task Execution Protocol

- Read PROGRESS.md first to find current task
- Read the task file at `.claude/orchestration-bottingos/tasks/task-N.M.md`
- Read ALL skills listed in the task file before writing any code
- Mark task [>] in PROGRESS.md when starting, [x] when done
- Commit after every task: `Task N.M: what and why`
- After implementing: invoke /simplify on changed files
- Before marking done: run `npx tsc --noEmit` - zero type errors required

## UI Rules (non-negotiable)

- Dark theme only. Background: #09090B (zinc-950). Surfaces: zinc-900/zinc-800.
- Accent: amber-500 (#F59E0B) only. No other accent colors.
- All prices/numbers: `font-mono tabular-nums`
- Loading states: Skeleton components only, never spinners
- Animations: 150-200ms only, functional purpose only
- NEVER use em dashes anywhere. Use hyphens or " - " instead.

## Code Rules

- Tauri invoke(): always lazy import (`const { invoke } = await import('@tauri-apps/api/core')`)
- Drizzle queries: always go through repositories in `src/lib/db/repositories/`
- Never query db directly from page components
- Vault data: always encrypt before write, decrypt on read via cryptoService
- No Prisma, no Server Components, no API Routes (static export only)

## Plugin Usage (per task type)

- UI tasks: invoke /frontend-design before implementing
- After each task: invoke /simplify
- Phase regression: invoke /superpowers:verification-before-completion
- PR review: invoke /code-review:code-review
