# Discord Integration Research - BottingOS

**Date**: 2026-03-07
**Goal**: Consolidate messages from multiple paid Discord cook groups into BottingOS, filtered by category (Pokemon, sneakers, Target deals, etc.)
**Core challenge**: Reading messages from Discord servers you don't own/admin

---

## 1. Discord Bot API (Official Bot Approach)

### How it works

- Create a bot application via Discord Developer Portal
- Generate an OAuth2 invite link with required permissions (Read Messages, etc.)
- Someone with **Manage Server** permission on the target server must authorize the bot

### Feasibility for Cook Groups: NOT VIABLE

- You cannot add a bot to a server you don't control
- Paid cook groups will never authorize a random third-party bot
- Even if they did, it would raise security/IP concerns for the cook group operators
- Cook groups actively restrict what bots can be added to protect their paid content

### Verdict: Dead end for this use case.

---

## 2. Self-Bot / User Token Approach

### How it works

The user provides their own Discord token. BottingOS uses it to read messages from channels the user already has access to (since they're a paying member of these cook groups).

**Getting the token**: User opens Discord in browser, opens DevTools (F12), goes to Network tab, finds any API request, copies the `Authorization` header value. Chrome extensions also exist for this (e.g., "Discord Get User Token").

**Two connection modes**:

#### 2a. REST API Polling

- `GET /channels/{channel_id}/messages` with user token in Authorization header
- Returns up to 100 messages per request
- Use `before` / `after` parameters for pagination
- Rate limited: ~50 requests/second globally, per-route limits vary
- Simple to implement, but polling introduces latency (seconds to minutes)

#### 2b. Gateway WebSocket (Real-time)

- Connect to `wss://gateway.discord.gg` with user token
- Send Identify payload with token
- Receive MESSAGE_CREATE events in real-time for all guilds/channels user is in
- Must maintain heartbeat (Opcode 1) every ~41 seconds
- Must handle reconnection, session resuming, etc.
- Libraries: `discord.py-self` (Python), `discum` (Python), raw WebSocket

### Libraries Available

- **discord.py-self** (github.com/dolfies/discord.py-self) - Most mature. Fork of discord.py for user accounts. Implements anti-detection features. Async Python. Well-documented.
- **discum** (PyPI) - Synchronous Python wrapper. Simpler API. Less actively maintained.
- **selfcord.py** (PyPI) - Another self-bot library option.

### Discord TOS Violation: YES - EXPLICITLY FORBIDDEN

From Discord's support article on Automated User Accounts:

> "Automating normal user accounts (generally called 'self-bots') outside of the OAuth2/bot API is forbidden, and can result in an account termination if found."

This is unambiguous. Any automation of a user account violates TOS.

### Detection Risk Assessment

Discord detects self-bots through:

1. **API request patterns** - Frequency, timing, non-human patterns
2. **Behavioral analysis** - Message frequency, reaction patterns, login locations
3. **Client identification** - User-Agent, client properties in Identify payload
4. **User reports** - Other users flagging suspicious behavior

**Mitigations** (used by discord.py-self and similar):

- Mimics official Discord client headers and properties
- Respects rate limits
- Adds human-like delays between actions
- Read-only usage (no sending messages) is lower risk than active automation

**Risk level for READ-ONLY monitoring**: MODERATE

- Read-only self-bots are harder to detect than ones that send messages
- The user is already a legitimate member of these servers
- No interaction with other users = no reports
- Main risk: unusual API access patterns from a non-standard client
- Anecdotal: many users run read-only self-bots for months/years without bans
- But Discord can and does ban accounts, with no appeal process

### If caught: Account termination

- Loss of all servers, friends, messages
- Need new account + re-purchase all cook group memberships ($25-75/mo each)
- Could be costly and inconvenient

---

## 3. Discord Gateway / WebSocket Details

### Connection Flow

1. GET `https://discord.com/api/gateway` to get WebSocket URL
2. Connect to `wss://gateway.discord.gg/?v=10&encoding=json`
3. Receive Opcode 10 (Hello) with heartbeat_interval
4. Send Opcode 2 (Identify) with token and client properties
5. Receive READY event with guild list
6. Begin receiving events: MESSAGE_CREATE, MESSAGE_UPDATE, etc.

### For BottingOS Use Case

- Connect once per user token
- Subscribe to specific guild/channel events
- Filter MESSAGE_CREATE events by channel ID
- Parse message content, embeds, attachments
- Forward to BottingOS backend for categorization and display

### Technical Considerations

- Must handle Opcode 7 (Reconnect) and Opcode 9 (Invalid Session)
- Session can be resumed after disconnect (avoids re-downloading guild state)
- Gateway intents for user accounts differ from bot accounts
- Rate limits on gateway: 120 events per 60 seconds for sending

---

## 4. Discord Webhook Approach

### How Discord Webhooks Actually Work

Discord webhooks are **one-directional INTO Discord**. They let external apps POST messages into a channel. They do NOT read messages from a channel.

### Can Users Forward Messages via Webhook?

Not directly. Webhooks are for sending, not receiving.

### Discord's Built-in Message Forwarding (Released ~Oct 2024)

- Discord added native message forwarding (right-click > Forward)
- Users can forward individual messages to other channels, servers, or DMs
- This is MANUAL and per-message - not viable for automated aggregation
- No API access to trigger forwarding programmatically

### Could the User Set Up Their Own Bot in a Private Server?

Possible hybrid approach:

1. User creates their own private Discord server
2. User manually uses Discord's forwarding to forward messages from cook groups to their server
3. A bot on the user's private server reads those forwarded messages
4. Bot sends them to BottingOS backend

**Problems**: Requires manual forwarding per message. Completely defeats the purpose.

### Verdict: Webhooks alone don't solve the problem.

---

## 5. Third-Party Tools and Services

### DiscordChatExporter (github.com/Tyrrrz/DiscordChatExporter)

- Open-source, .NET-based tool
- Exports message history from any channel to HTML/CSV/JSON/TXT
- Requires user token OR bot token
- CLI and GUI versions available
- Good for one-time exports, not real-time monitoring
- Same TOS violation as self-bot approach (uses user token)

### Apify Discord Message Scraper

- Cloud-based scraper on Apify marketplace
- Scrapes messages using user or bot token
- Outputs JSON format
- Scheduled runs possible
- Same TOS concerns

### Discord2Discord (github.com/luffy-yu/Discord2Discord)

- Forwards messages between Discord servers
- Uses self-bot approach under the hood
- Same TOS violations

### Chrome Extensions

- Several Chrome extensions can export Discord chat logs
- DiscordKit, Discordmate, etc.
- Export to CSV/HTML/JSON
- Manual/batch export, not real-time

### Verdict: All tools that read from cook groups require user token = same TOS risk as self-bot.

---

## 6. Automation Platforms (Zapier / IFTTT)

### Zapier Discord Integration

- Has "New Message Posted to Channel" trigger
- Can filter by keywords, users, roles
- Can forward to webhooks, databases, other apps

**Critical limitation**: Zapier requires adding its bot to the Discord server. The person connecting must have **Manage Server** permission. For cook groups you don't own, this is NOT possible.

### IFTTT Discord Integration

- Similar trigger capabilities
- Same limitation: requires bot authorization on the server

### Verdict: NOT VIABLE for cook groups you don't admin. Only works for servers you control.

---

## 7. Legal Considerations

### Discord Terms of Service

Self-botting is explicitly prohibited. From Discord's documentation:

- "Automating normal user accounts outside of the OAuth2/bot API is forbidden"
- Can result in account termination
- No formal legal action taken against individual self-bot users (as of research date)

### Computer Fraud and Abuse Act (CFAA)

- The 2022 Ninth Circuit ruling (hiQ v. LinkedIn) established that scraping publicly available data likely doesn't violate CFAA
- However, Discord data is behind authentication (not public)
- Accessing authenticated content via automated means could theoretically violate CFAA
- In practice: no known CFAA cases against individual Discord self-bot users
- Risk is primarily civil (TOS breach) not criminal

### GDPR / Privacy

- Scraping other users' messages and storing them could raise GDPR concerns in EU
- Cook group messages are typically product alerts/deals, not personal data
- Lower risk than scraping user profiles or DMs

### Practical Legal Risk: LOW

- Discord's enforcement is account bans, not lawsuits
- No precedent for legal action against individual read-only self-bot users
- The user is reading content they already paid to access
- They're not redistributing or reselling the content

---

## 8. What Do Other Botting Tools Do?

### AYCD

- Runs its own cook group ($50/mo) on Discord
- Provides Discord webhook integration for sending alerts FROM their tools TO Discord
- Does NOT appear to aggregate from other cook groups
- Integration is about pushing data into Discord, not pulling from it

### Cybersole

- Has its own Discord community
- Discord integration is for support/announcements
- No cook group aggregation feature

### SwiftSole

- iOS sneaker bot app ($49.99 lifetime)
- Has its own Discord for alerts and support
- No cross-cook-group aggregation

### Cook Group Monitor Bots (Internal)

- Cook groups build their own monitor bots that scrape retailer websites
- These bots post alerts INTO the cook group's Discord channels
- They scrape Nike, Shopify stores, etc. - not other Discord servers

### General Pattern

**No major botting tool aggregates across cook groups.** Each tool has its own Discord community. The aggregation BottingOS wants to do appears to be a novel feature in this space - which could be a differentiator but also explains why no established pattern exists.

---

## 9. Recommended Approaches (Ranked by Safety)

### Approach A: USER-DRIVEN FORWARDING (Safest - No TOS Violation)

**How it works:**

1. User installs a small companion bot on their OWN private Discord server
2. User manually configures Discord's built-in "Follow Channel" or uses message forwarding
3. OR: User sets up a simple macro/keyboard shortcut to forward relevant messages
4. Bot on private server captures forwarded messages
5. Bot sends to BottingOS backend via API

**Pros:**

- Zero TOS violation risk
- No user token needed in BottingOS
- Bot only needs to be on user's own server

**Cons:**

- Requires manual effort from user (forwarding messages)
- Not real-time unless user is actively forwarding
- Poor UX - defeats the "consolidation" value proposition

**Verdict:** Safe but impractical. Undermines the core feature.

---

### Approach B: READ-ONLY SELF-BOT WITH RISK DISCLOSURE (Moderate Risk - Recommended)

**How it works:**

1. User provides their Discord token to BottingOS (stored encrypted, never shared)
2. BottingOS connects to Discord Gateway as the user (read-only)
3. Listens for MESSAGE_CREATE events on specified channels
4. Categorizes and stores messages in BottingOS backend
5. User views consolidated feed with filters

**Implementation:**

```
Stack: Node.js or Python service
Library: discord.py-self (Python) or raw WebSocket (Node.js)
Connection: Gateway WebSocket for real-time
Fallback: REST API polling every 30-60 seconds
Storage: PostgreSQL with message content, channel, timestamp, category
```

**Risk mitigations:**

- READ-ONLY: Never send messages, react, or interact
- Respect all rate limits
- Mimic official client headers (discord.py-self does this)
- One connection per user token (no multiplexing)
- Add human-like jitter to requests
- Allow user to pause/disconnect at any time
- Clear disclosure: "This uses your Discord token and may violate Discord TOS"
- Recommend using an alt account for the cook groups

**Risk disclosure for users:**

- "Using this feature requires your Discord token"
- "This may violate Discord's Terms of Service"
- "Your account could be banned. We recommend using a separate Discord account for cook groups"
- "BottingOS stores your token encrypted and never shares it"

**Pros:**

- Achieves the actual goal (real-time cook group aggregation)
- Good UX - automatic, no manual forwarding
- Differentiator: no other botting tool does this
- Read-only = lower detection risk

**Cons:**

- TOS violation (account ban risk)
- User must trust BottingOS with their token
- Token management complexity (rotation if Discord forces re-auth)

**Verdict:** This is what the product needs. Be transparent about risks. Recommend alt accounts.

---

### Approach C: REST API POLLING (Moderate Risk - Simpler Alternative)

Same as Approach B but uses REST API polling instead of WebSocket.

**How it works:**

1. User provides Discord token
2. BottingOS polls `GET /channels/{id}/messages` every 30-120 seconds
3. Stores new messages, categorizes, displays

**Pros:**

- Simpler to implement than WebSocket
- Easier to manage rate limits
- Stateless - no connection to maintain

**Cons:**

- Not real-time (30-120 second delay)
- More API calls = potentially more detectable
- Must track last-seen message ID per channel

**Verdict:** Good starting point. Upgrade to Gateway WebSocket later if needed.

---

### Approach D: HYBRID - BROWSER EXTENSION (Lower Risk)

**How it works:**

1. Build a browser extension that runs alongside Discord web client
2. Extension reads messages from the DOM as user browses
3. Sends relevant messages to BottingOS backend
4. No separate API connection - piggybacks on user's existing session

**Pros:**

- No separate API connection (harder to detect)
- User's normal browsing behavior provides cover
- No token storage needed (extension reads from active session)
- Closest to "legitimate" usage

**Cons:**

- Only captures messages while user has Discord open in browser
- DOM scraping is fragile (Discord updates break it)
- Browser extension development/distribution complexity
- Still technically against TOS
- Doesn't work when user is offline

**Verdict:** Interesting option for risk-averse users. Could be offered as alternative to token-based approach.

---

## 10. Final Recommendation

### Primary approach: Approach B (Read-Only Self-Bot via Gateway)

**Why:**

1. It's the only approach that delivers the full value proposition
2. Read-only monitoring is the lowest-risk form of self-botting
3. Every tool that reads from cook groups requires the user's token - there is no way around this
4. The user is accessing content they already paid for
5. With proper risk disclosure and alt-account recommendation, the liability shifts to the user
6. No other botting tool does this - genuine differentiator

### Implementation plan:

1. **Phase 1**: REST API polling (simpler, proves the concept)
   - User enters token + channel IDs
   - Poll every 60 seconds
   - Store and categorize messages
   - Basic keyword-based filtering

2. **Phase 2**: Gateway WebSocket (real-time)
   - Persistent connection for instant message capture
   - Channel auto-discovery (list user's guilds/channels)
   - Smart categorization (keyword matching, ML later)

3. **Phase 3**: Browser extension (optional, for risk-averse users)
   - Companion extension that reads Discord web client
   - No separate API connection needed

### Key UX requirements:

- Clear risk disclosure before token entry
- Encrypted token storage (AES-256-GCM, same as password vault)
- One-click disconnect/token deletion
- "Use alt account" recommendation
- Channel picker: browse user's guilds, select specific channels to monitor
- Category tagging: auto-tag by channel name or manual assignment
- Unified feed with filters: Pokemon, sneakers, Target, Walmart, etc.

---

## Sources

- [Discord: Automated User Accounts (Self-Bots)](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots)
- [Discord: Platform Manipulation Policy](https://discord.com/safety/platform-manipulation-policy-explainer)
- [Discord: Rate Limits Documentation](https://discord.com/developers/docs/topics/rate-limits)
- [Discord: Gateway Documentation](https://docs.discord.com/developers/events/gateway)
- [Discord: Message Forwarding](https://support.discord.com/hc/en-us/articles/24640649961367-Message-Forwarding)
- [discord.py-self (GitHub)](https://github.com/dolfies/discord.py-self)
- [discord.py-self (DeepWiki)](https://deepwiki.com/dolfies/discord.py-self)
- [discum (PyPI)](https://pypi.org/project/discum/)
- [DiscordChatExporter (GitHub)](https://github.com/Tyrrrz/DiscordChatExporter)
- [Zapier Discord Integration](https://zapier.com/apps/discord/integrations)
- [IFTTT Discord Integration](https://ifttt.com/discord)
- [Zapier Community: Bot permissions issue](https://community.zapier.com/how-do-i-3/how-to-get-bot-into-discord-without-permissions-39358)
- [Cybersole Discord Support](https://support.cybersole.io/hc/en-us/articles/4416543157649-Discord)
- [AYCD Toolbox Review](https://botsthatwork.com/review/acyd-bot-toolbox/)
- [hiQ v. LinkedIn - CFAA Web Scraping Ruling](https://www.whitecase.com/insight-our-thinking/web-scraping-website-terms-and-cfaa-hiqs-preliminary-injunction-affirmed-again)
- [Discord Scraping Privacy Concerns (Cybernews)](https://cybernews.com/security/discord-messages-scraping-privacy-breach/)
- [How to Get Discord Token (Android Authority)](https://www.androidauthority.com/get-discord-token-3149920/)
- [Apify Discord Message Scraper](https://apify.com/jungle_synthesizer/discord-message-scraper)
