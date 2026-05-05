# Task 5.4: Discord Feed UI

## Objective

Build a unified Discord message feed with a channel tree sidebar, filter bar, keyword highlighting, and virtualized scrolling. Messages are displayed in real-time from the CDP capture system and kept in local state only (not persisted to database).

## Context

Tasks 5.1-5.3 provide the backend: Discord CDP launch, message capture, and channel selection. This task builds the frontend feed where users see incoming messages. Cook group monitors need fast scanning across multiple channels, keyword highlighting for drop alerts, and filtering by server/channel. Messages live in React state only - ephemeral by design (no database bloat).

## Dependencies

- Task 5.2: `discord-message` Tauri event with DiscordMessage payload
- Task 5.3: Channel selection settings, discord_keywords setting
- Phase 1: Settings table for loading keywords

## Blocked By

- Task 5.2 (needs message events)
- Task 5.3 (needs channel selection and keyword data)

## Research Findings

### Feed Layout (from ui-ux-design.md)

Two-panel layout:

- Left panel (240px): Channel tree showing monitored servers/channels with unread indicators
- Right panel: Unified message feed with filter bar at top

### Virtualization

- Use `@tanstack/react-virtual` for rendering 1000+ messages efficiently
- Only render visible messages + buffer (overscan: 20)
- Estimated row height with dynamic measurement
- Auto-scroll to bottom for new messages
- "Jump to latest" button when scrolled up

### Keyword Highlighting

- Keywords from `discord_keywords` setting (saved in Task 5.3)
- Highlight: `bg-amber-500/20 text-amber-400 px-0.5 rounded`
- Case-insensitive matching

### Message Rendering

- Author name (bold) + timestamp (relative)
- Content with keyword highlighting
- Embeds as cards below content
- Bot badge for bot authors
- Channel/server tag on each message in unified view

## Implementation Plan

### Step 1: Install Dependencies

```bash
npm install @tanstack/react-virtual
```

### Step 2: Create Channel Tree Component

`src/components/discord/channel-tree.tsx`:

```
+---------------------------+
| All Channels         (42) |
+---------------------------+
| v Server Name 1           |
|   # drops           (12)  |
|   # restock-alerts   (5)  |
| v Server Name 2           |
|   # alerts           (8)  |
+---------------------------+
```

- "All Channels" at top shows all messages when selected
- Collapsible server groups
- Channel names with `#` prefix
- Unread count badge (amber) per channel
- Click channel to filter feed
- Active channel highlighted with amber accent

### Step 3: Create Filter Bar Component

`src/components/discord/filter-bar.tsx`:

```
+------------------------------------------------------------------+
| [Search messages...] [Author dropdown] [Bot only toggle] [Clear] |
+------------------------------------------------------------------+
```

- Search input filters by content (debounced 300ms)
- Author dropdown for specific user filter
- "Bot only" toggle (most cook group info comes from bots)
- Clear button resets all filters

### Step 4: Create Message Feed Component

`src/components/discord/message-feed.tsx`:

Uses `@tanstack/react-virtual`:

```typescript
const rowVirtualizer = useVirtualizer({
  count: filteredMessages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,
  overscan: 20,
});
```

Each message row:

```
+------------------------------------------------------------------+
| [Initial] AuthorName [BOT] #channel-name          2 min ago      |
| Message content with **keyword** highlighted                     |
| [Embed Card if present]                                          |
+------------------------------------------------------------------+
```

- Author initial circle (first letter, colored by hash)
- Bot badge, channel tag pill, relative timestamp
- Content with keyword highlighting
- Embed cards: title, description, thumbnail, fields

### Step 5: Keyword Highlighting Logic

```typescript
function highlightKeywords(text: string, keywords: string[]): ReactNode {
    if (!keywords.length) return text;
    const regex = new RegExp(`(${keywords.map(escapeRegex).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part)
            ? <mark key={i} className="bg-amber-500/20 text-amber-400 px-0.5 rounded">{part}</mark>
            : part
    );
}
```

### Step 6: Create Main Discord Page

`src/app/(dashboard)/discord/page.tsx`:

```
+---------------------------+------------------------------------------+
| Channel Tree              | Filter Bar                               |
| (240px sidebar)           +------------------------------------------+
|                           | Message Feed (virtualized)               |
|                           |                                          |
|                           +------------------------------------------+
|                           | [Jump to latest] (when scrolled up)      |
+---------------------------+------------------------------------------+
```

State management:

```typescript
const [messages, setMessages] = useState<DiscordMessage[]>([]);
const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
const [keywords, setKeywords] = useState<string[]>([]);
const MAX_MESSAGES = 2000;

useEffect(() => {
  let unlisten: (() => void) | undefined;
  onDiscordMessage((msg) => {
    setMessages((prev) => {
      const next = [msg, ...prev];
      return next.length > MAX_MESSAGES ? next.slice(0, MAX_MESSAGES) : next;
    });
  }).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}, []);
```

- Listen for `discord-message` events on mount
- Cap at 2000 messages (oldest dropped)
- Load keywords from settings on mount
- Channel tree filters displayed messages
- Connection status banner at top
- Link to `/discord/settings` for configuration
- Empty state when no messages or not connected

### Step 7: Auto-Scroll Behavior

- Auto-scroll to bottom when new messages arrive AND user is at bottom
- Show "Jump to latest" floating button when scrolled up
- Clicking button scrolls to bottom and re-enables auto-scroll

### Step 8: Connection Status Banner

- Connected: green dot + "Connected to Discord"
- Disconnected: red dot + "Not connected" + "Connect" button
- Reconnecting: amber dot + "Reconnecting..."
- Listen for `discord-status` Tauri event for updates

## Files to Create

- `src/app/(dashboard)/discord/page.tsx` - Main Discord feed page
- `src/components/discord/message-feed.tsx` - Virtualized message list
- `src/components/discord/channel-tree.tsx` - Channel sidebar with unread counts
- `src/components/discord/filter-bar.tsx` - Message filter controls

## Files to Modify

- `package.json` - Add `@tanstack/react-virtual` dependency

## Contracts

### Provides

- Discord feed page at `/discord`
- Real-time message display from CDP capture
- Channel filtering via tree sidebar
- Keyword highlighting with amber background
- Virtualized rendering for 1000+ messages

### Consumes

- Task 5.2: `discord-message` Tauri event, `discord-status` Tauri event
- Task 5.3: `discord_monitored_channels` and `discord_keywords` from settings
- Task 5.1: `check_discord_status()` for connection banner
- `@tanstack/react-virtual` for virtualization

## Acceptance Criteria

- [ ] Discord page renders at `/discord`
- [ ] Channel tree shows monitored servers and channels
- [ ] Clicking a channel filters messages to that channel
- [ ] "All Channels" shows all messages
- [ ] Unread count badges update in real-time
- [ ] Messages appear in real-time from CDP capture events
- [ ] Message rows show author, channel tag, timestamp, content
- [ ] Bot messages display bot badge
- [ ] Embeds render as cards with title/description
- [ ] Keywords highlighted with amber background
- [ ] Search filter works with 300ms debounce
- [ ] "Bot only" toggle filters to bot messages
- [ ] Virtualized scrolling handles 1000+ messages smoothly
- [ ] Auto-scroll to bottom for new messages
- [ ] "Jump to latest" button when scrolled up
- [ ] Messages capped at 2000 (oldest dropped)
- [ ] Connection status banner shows current state
- [ ] Empty state when no messages or not connected
- [ ] Design matches zinc dark theme with amber accents

## Testing Protocol

### Unit Tests

- Test keyword highlighting with multiple keywords
- Test message filtering by channel
- Test message cap logic (oldest dropped at 2000)

### Browser/Playwright Tests

- Open Discord page with no connection - verify empty state
- Connect Discord, send messages - verify they appear
- Click channel in tree - verify feed filters
- Type in search - verify content filter
- Toggle "Bot only" - verify filter
- Scroll up - verify "Jump to latest" appears

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/discord-integration.md`
- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/5.4-discord-feed`
- Commit prefix: `Task 5.4:`
