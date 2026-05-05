# Discord TOS-Safe Integration Approaches for BottingOS

## Research Date: 2026-03-07

## Context

The user is a member of multiple paid cook groups on Discord ($20-50+ each). They need to monitor messages from these groups for deal alerts. Self-bots (user tokens) were previously considered but REJECTED because:

1. Violates Discord TOS - risks account bans
2. User's MAIN account is in these groups - can't use alts without re-paying
3. Need a TOS-compliant (or at minimum, low-risk) approach

---

## TOS Baseline: What Discord Actually Prohibits

### Discord TOS (current as of 2026)

- **Self-bots**: Automating normal user accounts outside of OAuth2/bot API is FORBIDDEN. Can result in account termination.
- **Client modifications**: Modifying the Discord client "for any reason" is against TOS - including automating account actions or altering appearance/layout.
- **Third-party clients**: Technically prohibited, but Discord staff have stated they are "never trying to ban third party clients (that aren't self-bots)" and it "would be a waste of time."
- **Message Content Intent**: Bots need privileged intent approval to read message content. Only granted for legitimate bot use cases.
- **Key distinction**: Discord's ENFORCEMENT focuses on automated API calls using user tokens. Read-only, passive observation through the normal client UI is a gray area.

### What This Means

- Any approach using a user token to call Discord's API = HIGH RISK
- Any approach that modifies the Discord client = technically against TOS but rarely enforced
- Any approach that passively reads what the user already sees = gray area, much lower risk
- Any approach using the official Bot API in your OWN server = fully compliant

---

## Approach 1: Browser Extension (DOM Scraping)

**TOS Risk: MEDIUM-LOW | Feasibility: HIGH | Recommended: YES**

### How It Works

A Chrome/Firefox extension injects a content script into discord.com. The content script reads message content from the DOM (what the user already sees on screen) and forwards it to your backend via webhook/API.

### Key Details

- Extension reads the rendered DOM - it does NOT call Discord's API directly
- The user is logged in normally, viewing messages normally
- Extension just copies text that's already displayed
- Multiple existing extensions do this: Discrub, Discord Scraper, DiscordScraper (academic), axiom.ai
- Vencord even ships as a browser extension/userscript on Chrome Web Store

### TOS Analysis

- This is NOT a self-bot (no API calls with user token)
- This IS a form of client modification (content script injected into the page)
- Discord's TOS prohibits "modifying the Discord client" but enforcement is almost exclusively targeted at self-bots and spam automation
- Vencord FAQ: "there are no known cases of users getting banned for using client mods"
- Discord staff: "never trying to ban third party clients"
- READ-ONLY behavior is extremely low risk - no messages sent, no API spam

### Implementation

1. Chrome extension with content script matching `discord.com/*`
2. MutationObserver on the message list container to detect new messages
3. Extract message text, author, channel, timestamp from DOM elements
4. Forward to local backend or webhook for processing
5. No interaction with Discord's API at all

### Pros

- No user token needed
- Works with user's existing login session
- User controls when it runs (can disable extension)
- Very hard for Discord to detect (looks like normal page viewing)
- Multiple precedents exist (Discrub, Vencord Web, etc.)

### Cons

- Technically against TOS (client modification)
- Requires Discord to be open in browser (not desktop app)
- Only captures messages visible in the current channel view
- Need to handle channel switching or auto-scroll
- DOM structure can change with Discord updates (maintenance burden)

### Risk Mitigation

- Read-only only - never send messages or interact with UI programmatically
- Don't make excessive API calls or requests
- Rate-limit forwarding to avoid any suspicious patterns

---

## Approach 2: macOS Accessibility API (Screen Reading)

**TOS Risk: LOW | Feasibility: MEDIUM | Recommended: YES (as secondary)**

### How It Works

Use macOS Accessibility APIs to read the text content of the Discord desktop app window, similar to how screen readers work for visually impaired users.

### Key Details

- Discord desktop is an Electron app - its UI is accessible via macOS accessibility tree
- Libraries: AXSwift (Swift), pyatomac (Python), macapptree (Python - extracts accessibility tree as JSON)
- Discord is WCAG 2.1 compliant and has good accessibility support
- Can read message content, channel names, usernames from the accessibility tree

### TOS Analysis

- This does NOT modify the Discord client at all
- This does NOT use Discord's API
- This uses the OS-level accessibility framework - same as legitimate screen readers
- Discord cannot reasonably detect this (it's OS-level, outside their sandbox)
- Arguably the most TOS-safe automated approach since it mirrors what assistive technology does

### Implementation

1. Python script using pyatomac or macapptree to read Discord window
2. Poll the accessibility tree periodically for new messages
3. Parse message content, author, channel from accessibility elements
4. Forward to backend for processing

### Pros

- Works with Discord desktop app (no browser required)
- Does NOT modify Discord client
- Uses legitimate OS accessibility APIs
- Virtually undetectable by Discord
- Same mechanism as actual screen readers for disabled users

### Cons

- Requires Discord window to be visible (or at least not minimized)
- macOS only (not cross-platform)
- Accessibility tree parsing can be fragile
- Requires user to grant Accessibility permissions to the script
- Slower than API-based approaches
- May miss messages if Discord window isn't focused/scrolled
- macOS Catalina+ restricts some distributed notification features

### Technical Notes

- AXorcist: Modern Swift wrapper with async/await, chainable queries
- macapptree: Extracts accessibility tree as JSON with labeled bounding boxes
- Since macOS Catalina, listening to all distributed notifications requires privileged process

---

## Approach 3: macOS Notification Capture

**TOS Risk: VERY LOW | Feasibility: LOW-MEDIUM | Recommended: PARTIAL**

### How It Works

Capture Discord's desktop notifications as they appear on macOS, parse the notification content for deal information.

### Key Details

- Discord sends push/desktop notifications for mentions, DMs, and channel messages (if configured)
- macOS notifications can potentially be captured via UNUserNotificationCenter or DistributedNotificationCenter
- NSUserNotificationCenter (deprecated) / UNUserNotificationCenter (current)

### TOS Analysis

- Does NOT interact with Discord at all
- Reads OS-level notifications, not Discord's client or API
- Completely outside Discord's control
- Essentially zero TOS risk

### Limitations (Major)

- Discord notifications contain LIMITED content - typically just "User: first few words..."
- Notifications are truncated - not full message content
- User must configure Discord to send notifications for relevant channels
- Can't get full deal details from truncated notifications
- Since macOS Catalina, listening to other apps' notifications is restricted
- Notification content may not include enough info for deal parsing

### Verdict

Useful as a TRIGGER mechanism ("new message detected in cook group channel") but NOT sufficient as primary data source. Could be combined with Approach 1 or 2 - notification triggers the extension/accessibility reader to capture full content.

---

## Approach 4: Manual Forwarding to Personal Server + Bot API

**TOS Risk: NONE | Feasibility: MEDIUM | Recommended: YES (hybrid)**

### How It Works

User creates their own Discord server. They manually forward messages from cook groups to their personal server using Discord's built-in forwarding feature. A legitimate bot in their personal server processes the forwarded messages.

### Key Details

- Discord's built-in message forwarding launched July 2024
- Users can forward messages to up to 5 recipients (DMs, group chats, server channels)
- Forwarded messages show a "Forwarded" label but hide original author
- Bot in personal server is 100% TOS compliant (proper bot account, OAuth2, etc.)
- Bot can read forwarded messages and process them for deals

### TOS Analysis

- Forwarding is a NATIVE Discord feature - fully intended use
- Bot in your own server with proper bot account = fully compliant
- Zero risk of account ban

### Limitations

- MANUAL process - user must forward each message individually
- Adds friction - defeats the purpose of automation
- Can't forward in bulk
- Only works for messages you actively see and choose to forward

### Semi-Automation Possibilities

- Could combine with Approach 1 (browser extension): extension detects new messages, auto-clicks the forward button to send to personal server
- This would automate the forwarding but introduces the same TOS gray area as Approach 1

---

## Approach 5: Discord Embedded App SDK / Activities

**TOS Risk: NONE | Feasibility: VERY LOW | Recommended: NO**

### How It Works

Build an app using Discord's Embedded App SDK that runs inside Discord as an "Activity."

### Why It Doesn't Work

- Activities run in iframes within voice/text channels
- They're designed for games and interactive experiences
- They do NOT have access to read messages from other channels
- They run in a sandboxed environment
- The cook group server admins would need to install the app
- Cook groups will never install a random third-party app

### Verdict

Not applicable for this use case.

---

## Approach 6: Discord OAuth2

**TOS Risk: NONE | Feasibility: VERY LOW | Recommended: NO**

### How It Works

Use Discord's OAuth2 to get user authorization and access their messages.

### Why It Doesn't Work

- OAuth2 scopes do NOT include message read access for user accounts
- Available scopes: identify, email, guilds (list), connections, bot (add bot to server)
- There is NO scope for "read messages on behalf of user"
- The `bot` scope requires adding a bot to a server (needs Manage Server permission)
- User is not admin in cook groups - can't add bots

### Verdict

Dead end. Discord intentionally does not expose message reading through OAuth2 for user accounts.

---

## Approach 7: Zapier / IFTTT / Make.com

**TOS Risk: NONE | Feasibility: VERY LOW | Recommended: NO**

### How It Works

Use automation platforms to trigger on new Discord messages and forward them.

### Why It Doesn't Work

- All of these platforms require a bot to be added to the server
- Adding a bot requires Manage Server or Administrator permission
- User is NOT an admin in cook group servers
- Zapier trigger "New Message Posted in Channel" requires bot in server
- IFTTT requires "Manage Server permission" to add the IFTTT bot
- Same for Make.com

### Verdict

Dead end unless user is server admin (they're not).

---

## Approach 8: Discord Follow/Announcement Channels

**TOS Risk: NONE | Feasibility: VERY LOW | Recommended: NO**

### How It Works

Use Discord's "Follow Channel" feature to auto-forward announcement channel posts to your own server.

### Why It Doesn't Work

- Only works with Announcement Channels (special channel type)
- Cook groups mostly use regular text channels, not announcement channels
- Following requires Manage Webhooks permission in the DESTINATION server (achievable)
- But the SOURCE channel must be an Announcement Channel type (unlikely in cook groups)
- Server owner must have set up the channel as Announcement type

### Verdict

Only works if cook groups happen to use announcement channels (very unlikely for deal alerts).

---

## Approach 9: GDPR Data Request

**TOS Risk: NONE | Feasibility: VERY LOW | Recommended: NO**

### How It Works

Request a copy of your Discord data under GDPR/privacy rights.

### Why It Doesn't Work

- Discord takes up to 30 days to fulfill data requests
- Data package is a one-time ZIP export, not real-time
- Only includes YOUR sent messages, not messages from others in channels
- Completely useless for real-time deal monitoring

### Verdict

Not applicable for real-time monitoring.

---

## Approach 10: Email/Push Notification Parsing

**TOS Risk: NONE | Feasibility: LOW | Recommended: NO (standalone)**

### How It Works

Parse Discord's email notifications or push notifications for message content.

### Why It Doesn't Work Well

- Discord email notifications are limited to DMs and missed messages
- Email notifications don't include full server channel messages
- Push notifications are truncated
- No way to get full message content from notifications alone
- Significant delay compared to real-time monitoring

### Verdict

Insufficient as standalone approach. Potentially useful as a trigger/alert mechanism only.

---

## Approach 11: Screen Capture + OCR

**TOS Risk: VERY LOW | Feasibility: MEDIUM-LOW | Recommended: BACKUP**

### How It Works

Capture screenshots of the Discord window and use OCR to extract message text.

### Key Details

- Take periodic screenshots of Discord window
- Use Tesseract OCR or cloud OCR to extract text
- Parse extracted text for deal keywords

### TOS Analysis

- Does not interact with Discord at all
- Reads pixels from the screen - OS-level operation
- Zero TOS risk

### Limitations

- Inaccurate compared to DOM reading or accessibility APIs
- OCR errors on usernames, special characters, links
- Resource intensive (continuous screenshotting)
- Discord must be visible on screen
- Slower and less reliable than other approaches
- Can't easily distinguish message boundaries

### Verdict

Works but inferior to Approach 1 (browser extension) and Approach 2 (accessibility API) in every way. Only use if other approaches fail.

---

## Approach 12: Existing Botting Tool Approaches

**TOS Risk: VARIES | Feasibility: N/A (reference only)**

### What Existing Tools Actually Do

**Apify Discord Scrapers**: Use user authentication tokens to call Discord's API directly. This is essentially a self-bot approach - fully against TOS. They explicitly state: "This scraper works with your Discord user token. No bot creation or server admin rights required."

**Cook Group Monitors (Notify, Paragon, etc.)**: These run their OWN bots in their OWN servers. They're not scraping other servers - they generate the alerts themselves using their own monitors that watch retailer websites. The cook group IS the source of alerts.

**Whop.com**: Provides Discord integration for server management (role assignment, access control based on payment). Does NOT aggregate messages from other servers.

**BetterDiscord / Vencord**: Client modifications that add plugins to Discord desktop app. Against TOS but no known bans for using them. Vencord also available as browser extension.

### Key Insight

No legitimate tool aggregates messages from cook groups you're a member of. Cook groups themselves ARE the aggregators - they run their own monitors. The problem we're solving (reading THEIR output) is fundamentally different.

---

## Recommended Strategy

### Primary: Browser Extension (Approach 1)

**Best balance of feasibility, reliability, and risk.**

1. Build a Chrome extension that reads messages from discord.com
2. Content script uses MutationObserver to detect new messages in the DOM
3. Extracts message text, author, channel info, timestamps
4. Sends to BottingOS backend via local API or webhook
5. Backend processes messages for deal detection, scoring, alerts

**Why this wins:**

- Most reliable data capture
- Structured data from DOM (not OCR guessing)
- User controls it (can disable anytime)
- Precedent: Multiple extensions already do this (Discrub, Discord Scraper)
- Low detection risk: read-only, no API calls, no automation
- Works across all cook groups simultaneously (just have channels open)

### Secondary: macOS Accessibility API (Approach 2)

**Backup for desktop app users.**

1. Python script reads Discord desktop app's accessibility tree
2. Extracts message content from UI elements
3. Forwards to backend

**Why this is backup:**

- More technically complex
- Requires Discord to be visible
- macOS only
- But: even LOWER TOS risk than browser extension

### Hybrid Enhancement: Personal Server Bridge (Approach 4)

**For highest-priority alerts only.**

1. User creates personal Discord server
2. Adds a proper bot (100% TOS compliant)
3. For critical deals, user manually forwards via Discord's native feature
4. Bot processes forwarded messages immediately
5. Triggers fastest-possible alert/purchase flow

**Why this complements:**

- Zero TOS risk path for the most time-sensitive deals
- Manual step is acceptable if it's only for "buy now" moments
- Everything else (monitoring, scoring) handled by extension

---

## Risk Summary Table

| Approach                | TOS Risk   | Detection Risk | Feasibility | Data Quality | Recommended    |
| ----------------------- | ---------- | -------------- | ----------- | ------------ | -------------- |
| Browser Extension (DOM) | Medium-Low | Very Low       | High        | High         | PRIMARY        |
| macOS Accessibility API | Low        | Very Low       | Medium      | Medium-High  | SECONDARY      |
| Notification Capture    | Very Low   | None           | Low-Medium  | Low          | TRIGGER ONLY   |
| Manual Forward + Bot    | None       | None           | Medium      | High         | HYBRID         |
| Screen Capture + OCR    | Very Low   | None           | Medium-Low  | Medium-Low   | BACKUP         |
| Self-bot (user token)   | HIGH       | Medium         | High        | High         | REJECTED       |
| OAuth2                  | None       | None           | N/A         | N/A          | NOT POSSIBLE   |
| Zapier/IFTTT/Make       | None       | None           | N/A         | N/A          | NOT POSSIBLE   |
| Embedded App SDK        | None       | None           | Very Low    | N/A          | NOT APPLICABLE |
| Follow Channels         | None       | None           | Very Low    | N/A          | NOT APPLICABLE |
| GDPR Data Request       | None       | None           | Very Low    | N/A          | NOT APPLICABLE |

---

## Implementation Priority

1. **Phase 1**: Build Chrome extension for discord.com DOM scraping (primary data pipeline)
2. **Phase 2**: Set up personal server + bot for manual forward path (zero-risk complement)
3. **Phase 3 (optional)**: macOS accessibility API reader as desktop app alternative
4. **Future**: If Discord changes DOM structure frequently, consider accessibility API as primary

---

## Technical Architecture Sketch

```
Cook Group Channels (discord.com in browser)
    |
    v
[Chrome Extension - Content Script]
    | MutationObserver on message list
    | Extract: author, content, channel, timestamp, embeds, links
    |
    v
[Extension Background Script]
    | Batch messages, deduplicate
    | Rate limit (1 batch per 5-10 seconds)
    |
    v
[BottingOS Backend API]
    | /api/discord/ingest
    | Parse deal info, extract ASINs/links/prices
    | Score deals, filter noise
    |
    v
[Alert System]
    | Push notification / Telegram / SMS
    | Dashboard display
    | Auto-purchase trigger (if configured)
```

---

## Sources

- [Discord Self-Bot Policy](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots)
- [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy)
- [Discord Platform Manipulation Policy](https://discord.com/safety/platform-manipulation-policy-explainer)
- [Vencord FAQ - No Known Bans](https://vencord.dev/faq/)
- [Discord Embedded App SDK](https://github.com/discord/embedded-app-sdk)
- [Discord OAuth2 Scopes](https://discord.com/developers/docs/topics/oauth2)
- [Discord Message Forwarding](https://support.discord.com/hc/en-us/articles/24640649961367-Message-Forwarding)
- [Discord Channel Following FAQ](https://support.discord.com/hc/en-us/articles/360028384531-Channel-Following-FAQ)
- [Discrub Extension (GitHub)](https://github.com/prathercc/discrub-ext)
- [Vencord Web (Chrome Web Store)](https://chromewebstore.google.com/detail/vencord-web/cbghhgpcnddeihccjmnadmkaejncjndb)
- [Discord Accessibility](https://discord.com/accessibility)
- [macapptree - macOS Accessibility Parser](https://github.com/MacPaw/macapptree)
- [AXSwift - Swift Accessibility Wrapper](https://github.com/tmandry/AXSwift)
- [AXorcist - Modern Swift Accessibility](https://github.com/steipete/AXorcist)
- [Apify Discord Scraper](https://apify.com/louisdeconinck/discord-scraper)
- [Discord Data Request](https://support.discord.com/hc/en-us/articles/360004027692-Requesting-a-Copy-of-your-Data)
- [Zapier Discord Integration](https://zapier.com/apps/discord/integrations)
- [IFTTT Discord Integration](https://ifttt.com/discord)
- [Whop Cook Groups Guide](https://whop.com/blog/ultimate-sneaker-cook-groups-guide/)
