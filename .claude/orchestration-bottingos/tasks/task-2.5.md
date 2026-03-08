# Task 2.5: Password Vault (Rebuild)

## Objective

Migrate the password vault from localStorage to Drizzle/SQLite with real AES-256-GCM encryption via the CryptoService. Build a secure credential manager with copy-to-clipboard without revealing, auto-lock on idle, and panic hide (Cmd+Shift+H).

## Context

The existing vault at `src/app/(dashboard)/vault/page.tsx` uses localStorage with no real encryption. This task rebuilds it using `vaultRepo` from Task 1.4, which transparently encrypts/decrypts via the CryptoService (Task 1.3). The vault stores site credentials (username + encrypted password + encrypted notes) for retailer accounts the user manages.

The vault is sensitive - it holds real passwords. Security is the top priority. Passwords are never shown in plaintext unless the user explicitly clicks "reveal." Copy-to-clipboard works without revealing.

## Dependencies

- Task 1.3 - CryptoService for encrypt/decrypt, isUnlocked, lock
- Task 1.4 - `vaultRepo` for encrypted CRUD operations
- Task 2.1 - App shell, PageHeader, PageTransition, design tokens

## Blocked By

- Task 1.3 (needs encryption module)
- Task 1.4 (needs vault repository)
- Task 2.1 (needs app shell)

## Research Findings

### Vault Entry Schema

```typescript
vault_entries: {
  (id,
    site,
    username,
    passwordCiphertext,
    passwordIv,
    notesCiphertext,
    notesIv,
    createdAt,
    updatedAt);
}
```

The `vaultRepo` handles encryption/decryption transparently:

- `vaultRepo.create({ site, username, password, notes })` - encrypts password and notes before insert
- `vaultRepo.getAll()` - returns entries with password and notes as decrypted plaintext
- If CryptoService is locked, operations throw

### Security Features

1. **Copy without reveal**: Click copy button copies password to clipboard. The password field shows dots, never changes to plaintext.
2. **Reveal toggle**: Eye icon toggle to show/hide password. Default hidden.
3. **Auto-lock**: Handled by CryptoService's idle timeout (5 min). When locked, vault shows lock screen.
4. **Panic hide**: Cmd+Shift+H instantly hides the vault content (replaces with empty state or navigates to dashboard). Does NOT lock the crypto - just visual hide.
5. **Clipboard auto-clear**: After copying a password, clear clipboard after 30 seconds.

### UI Pattern

Card grid or table layout showing vault entries:

- Each entry: site favicon/icon, site name, username, masked password, action buttons
- Actions: copy password, copy username, reveal password, edit, delete
- Search bar to filter by site name
- Sort by site name (A-Z) or recently added

## Implementation Plan

### Step 1: Create Entry Form Component (src/components/vault/entry-form.tsx)

Sheet form for adding/editing vault entries:

```tsx
interface EntryFormProps {
  entry?: VaultEntry; // for editing
  onSubmit: (data: {
    site: string;
    username: string;
    password: string;
    notes?: string;
  }) => void;
  onClose: () => void;
}
```

Fields:

- Site (text input, required) - e.g., "nike.com"
- Username (text input, required)
- Password (password input with reveal toggle, required)
- Notes (textarea, optional)
- Generate password button (random 16-char with symbols)

Password field:

- Default type="password" (masked)
- Eye icon toggles visibility
- Copy button copies without revealing

### Step 2: Create Entry Card Component (src/components/vault/entry-card.tsx)

Card component for displaying a single vault entry:

```tsx
interface EntryCardProps {
  entry: {
    id: number;
    site: string;
    username: string;
    password: string; // decrypted, but displayed masked
    notes?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}
```

Display:

- Site name (text-lg font-medium)
- Site domain as secondary text
- Username (text-sm text-muted-foreground) with copy button
- Password: shown as dots (default), with copy + reveal buttons
- Notes: collapsed by default, expandable
- Edit and Delete action buttons (shown on hover or in dropdown menu)
- Card border glow on hover (`hover:border-amber-500/30`)

### Step 3: Create Password Generator (src/lib/password-generator.ts)

```typescript
function generatePassword(
  length = 16,
  options?: {
    uppercase?: boolean; // default true
    lowercase?: boolean; // default true
    numbers?: boolean; // default true
    symbols?: boolean; // default true
  },
): string;
```

Use `crypto.getRandomValues()` for cryptographically secure random selection.

### Step 4: Create Clipboard Utility (src/lib/clipboard.ts)

```typescript
async function copyToClipboard(
  text: string,
  autoClearMs = 30_000,
): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (autoClearMs > 0) {
    setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {});
    }, autoClearMs);
  }
}
```

### Step 5: Rebuild Vault Page (src/app/(dashboard)/vault/page.tsx)

Layout:

```
<PageHeader title="Password Vault" actions={[
  { label: "Add Entry", onClick: openEntryForm },
  { label: "Lock", onClick: lock, icon: Lock },
]} />

{!isUnlocked ? (
  <LockedState /> // "Vault is locked. Enter master password to access."
) : (
  <>
    <SearchInput placeholder="Search sites..." />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {entries.map(entry => (
        <EntryCard key={entry.id} entry={entry} ... />
      ))}
    </div>

    {entries.length === 0 && <EmptyState ... />}
  </>
)}

<EntryForm />
```

### Step 6: Implement Panic Hide (Cmd+Shift+H)

Register global keyboard shortcut:

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "H") {
      e.preventDefault();
      setHidden(true); // Hide vault content, show innocuous placeholder
      // Or navigate to dashboard: router.push('/');
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, []);
```

When hidden, show a neutral empty state or redirect to dashboard. Press Cmd+Shift+H again (or click anywhere) to unhide.

### Step 7: Implement Lock Button

"Lock" button in the header calls `cryptoService.lock()` which:

- Clears the CryptoKey from memory
- CryptoProvider detects locked state
- Master password dialog reappears

### Step 8: Remove localStorage Usage

Delete all localStorage references. All data through `vaultRepo`.

## Files to Create

- `src/components/vault/entry-form.tsx` - Add/edit vault entry sheet
- `src/components/vault/entry-card.tsx` - Vault entry display card
- `src/lib/password-generator.ts` - Secure random password generator
- `src/lib/clipboard.ts` - Copy to clipboard with auto-clear

## Files to Modify

- `src/app/(dashboard)/vault/page.tsx` - Full rebuild

## Contracts

### Provides (for downstream)

- Vault page at `/vault` route
- `generatePassword()` utility (reusable)
- `copyToClipboard()` utility with auto-clear (reusable)
- Panic hide keyboard shortcut (Cmd+Shift+H)

### Consumes (from upstream)

- `vaultRepo` from Task 1.4 (getAll, getById, create, update, remove) - handles encryption transparently
- `cryptoService` from Task 1.3 (isUnlocked, lock)
- `useCrypto()` hook from Task 1.3 (isUnlocked state)
- `<PageHeader>`, `<PageTransition>`, `<EmptyState>` from Task 2.1
- shadcn: Card, Input, Button, Sheet, DropdownMenu

## Acceptance Criteria

- [ ] Vault entries stored with AES-256-GCM encrypted passwords and notes
- [ ] Passwords display as dots by default
- [ ] Copy password works without revealing (copies decrypted value to clipboard)
- [ ] Clipboard auto-clears after 30 seconds
- [ ] Reveal toggle shows/hides password
- [ ] Password generator creates 16-char random passwords
- [ ] Add entry form validates required fields (site, username, password)
- [ ] Edit entry updates encrypted data correctly
- [ ] Delete entry removes from database
- [ ] Search filters entries by site name
- [ ] Lock button clears encryption key and shows master password dialog
- [ ] Vault shows locked state when CryptoService is locked
- [ ] Panic hide (Cmd+Shift+H) immediately hides vault content
- [ ] No localStorage usage remains
- [ ] Empty state shown when vault has no entries
- [ ] Card grid layout with hover effects
- [ ] Page wraps in PageTransition

## Testing Protocol

### Unit/Integration Tests

- Test password generator produces correct length and character sets
- Test clipboard copy and auto-clear
- Test vault CRUD through vaultRepo (create, read back decrypted, update, delete)
- Verify raw database has encrypted values (not plaintext)

### Browser Testing (Playwright MCP)

- Navigate to vault page
- Verify locked state if CryptoService is locked
- Unlock with master password
- Add a vault entry with site, username, password, notes
- Verify entry appears in card grid
- Verify password is masked (dots)
- Click copy password - verify clipboard contains correct value
- Click reveal - verify password shows
- Edit the entry - verify changes persist
- Delete the entry - verify removal
- Test panic hide (Cmd+Shift+H)
- Test lock button
- Take screenshots of: locked state, empty state, populated vault, entry form, revealed password

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/desktop-app-architecture.md` (section 4 - secure storage)

## Git

- Branch: feat/2.5-vault-rebuild
- Commit message prefix: Task 2.5:
