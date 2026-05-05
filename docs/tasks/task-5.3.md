# Task 5.3: Channel Selection Settings

## Objective

Build a UI for selecting which Discord servers and channels to monitor. Display servers and channels in a tree view with checkboxes, and persist selections to the settings table as JSON.

## Context

Task 5.2 captures messages from all channels by default. Users need a way to select specific servers/channels to monitor - most cook groups have dedicated channels for drops and restocks. This settings page fetches the channel list from Discord via CDP, displays it in a tree structure, and saves selections. The saved channel IDs are passed to `update_monitored_channels()` from Task 5.2.

## Dependencies

- Task 5.2: CDP capture commands, `update_monitored_channels()`
- Phase 1: Settings table, Drizzle ORM, db instance

## Blocked By

- Task 5.2 (needs CDP connection to enumerate channels)

## Research Findings

### Channel Enumeration via CDP

Task 5.2's CDP connection can enumerate guilds and channels by injecting JS that accesses Discord's internal stores:

```javascript
const stores = Object.values(wpRequire.c)
  .map((m) => m?.exports)
  .filter(Boolean)
  .flatMap((e) => [e, e.default, e.Z, e.ZP].filter(Boolean));
const GuildStore = stores.find((m) => m?.getGuilds && m?.getGuild);
const ChannelStore = stores.find(
  (m) => m?.getChannel && m?.getMutableGuildChannelsForGuild,
);
const guilds = Object.values(GuildStore.getGuilds());
const channels = guilds.flatMap((g) => {
  const guildChannels = ChannelStore.getMutableGuildChannelsForGuild(g.id);
  return Object.values(guildChannels)
    .filter((c) => c.type === 0) // text channels only
    .map((c) => ({
      id: c.id,
      name: c.name,
      guild_id: g.id,
      guild_name: g.name,
    }));
});
```

### Settings Persistence

Store monitored channels as JSON in the settings table:

- Key: `discord_monitored_channels` - JSON array of channel IDs
- Key: `discord_keywords` - JSON array of keyword strings

### Tree View Pattern

- Server (guild) as parent node with checkbox
- Channels as children with individual checkboxes
- Checking a server checks all its channels
- Unchecking a server unchecks all its channels
- Partially checked server shows indeterminate state
- "Monitor all" toggle at top to bypass channel filtering

## Implementation Plan

### Step 1: Add Tauri Command for Channel Enumeration

This may already exist from Task 5.2 as `discord_get_channels`. If not, add a command that:

1. Uses the active CDP connection
2. Injects the channel enumeration JS via `Runtime.evaluate`
3. Returns array of `{ id, name, guild_id, guild_name }`

Frontend type:

```typescript
interface DiscordChannel {
  id: string;
  name: string;
  guild_id: string;
  guild_name: string;
}
```

### Step 2: Create Channel Selector Component

`src/components/discord/channel-selector.tsx`:

```typescript
interface ChannelSelectorProps {
  channels: DiscordChannel[];
  selected: string[];
  onChange: (channelIds: string[]) => void;
}
```

Layout:

```
+------------------------------------------+
| [Toggle] Monitor All Channels            |
+------------------------------------------+
| [Search channels...]                     |
+------------------------------------------+
| [v] [x] Server Name 1                   |
|     [x] #general                         |
|     [x] #drops                           |
|     [ ] #off-topic                       |
| [>] [-] Server Name 2                   |
|     [x] #restock-alerts                  |
|     [ ] #chat                            |
+------------------------------------------+
```

- Collapsible server groups (expanded by default)
- Server checkbox toggles all children
- Individual channel checkboxes
- Indeterminate state on server when partially selected
- Search input filters channels by name
- "Monitor All" toggle bypasses individual selection
- Channel count badge per server: "3/12 monitored"

### Step 3: Create Settings Page

`src/app/(dashboard)/discord/settings/page.tsx`:

Layout:

```
+------------------------------------------+
| Discord Settings                         |
+------------------------------------------+
| Connection Status                        |
| [Connected indicator]                    |
| [Connect Discord] or [Disconnect]        |
+------------------------------------------+
| Monitored Channels                       |
| [Channel Selector Tree]                  |
+------------------------------------------+
| Keywords                                 |
| [keyword input + chips]                  |
+------------------------------------------+
| [Save Settings]                          |
+------------------------------------------+
```

- Show connection status using `check_discord_status()`
- Connect/Disconnect buttons
- Channel selector tree (disabled when not connected)
- Save button persists to settings table
- On save, call `update_monitored_channels()` to apply immediately

### Step 4: Persistence Logic

```typescript
async function saveChannelSettings(channelIds: string[]) {
  await db
    .insert(settings)
    .values({
      key: "discord_monitored_channels",
      valuePlain: JSON.stringify(channelIds),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { valuePlain: JSON.stringify(channelIds), updatedAt: new Date() },
    });

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_monitored_channels", { channelIds });
}
```

### Step 5: Keywords Input

- Tag-style input with chips for adding/removing keywords
- Persist to settings as `discord_keywords` JSON array
- Keywords used by Task 5.4's feed UI for highlighting

## Files to Create

- `src/app/(dashboard)/discord/settings/page.tsx` - Discord settings page
- `src/components/discord/channel-selector.tsx` - Tree view channel selector with checkboxes

## Files to Modify

- `src-tauri/src/commands/discord.rs` - Add channel enumeration command if not present from Task 5.2

## Contracts

### Provides

- Discord settings page at `/discord/settings`
- Settings keys: `discord_monitored_channels` (JSON array), `discord_keywords` (JSON array)
- `ChannelSelector` component reusable for tree-checkbox UIs
- Saved channel selections applied immediately to active CDP capture

### Consumes

- Task 5.1: `check_discord_status()`, `start_discord_cdp()`
- Task 5.2: `update_monitored_channels()`, channel enumeration
- Phase 1: `db`, `settings` table from schema

## Acceptance Criteria

- [ ] Settings page renders at `/discord/settings`
- [ ] Connection status indicator shows current Discord CDP state
- [ ] Connect/Disconnect buttons work correctly
- [ ] Channel list loads from Discord via CDP when connected
- [ ] Tree view displays servers with expandable channel lists
- [ ] Server checkbox toggles all child channels
- [ ] Individual channel checkboxes work independently
- [ ] Indeterminate state on server when some channels selected
- [ ] "Monitor All" toggle bypasses individual selection
- [ ] Search filters channels by name
- [ ] Channel count badge shows "N/M monitored" per server
- [ ] Selections persist to settings table on save
- [ ] Saved selections applied immediately to active capture
- [ ] Settings load correctly on page revisit
- [ ] Keywords input with chip-style tags
- [ ] Keywords persist to settings table
- [ ] Disabled state when Discord not connected
- [ ] Design matches zinc dark theme with amber accents

## Testing Protocol

### Unit Tests

- Test channel grouping logic (group channels by guild)
- Test checkbox state logic (all, none, indeterminate)
- Test settings persistence (save and load round-trip)

### Browser/Playwright Tests

- Connect Discord, load channels, select some channels, save
- Reload page, verify selections persisted
- Toggle "Monitor All", verify individual checkboxes disabled
- Search for a channel name, verify filter works
- Disconnect Discord, verify channel selector disabled

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/discord-cdp-implementation.md`
- `.claude/orchestration-bottingos/research/discord-integration.md`

## Git

- Branch: `feat/5.3-channel-settings`
- Commit prefix: `Task 5.3:`
