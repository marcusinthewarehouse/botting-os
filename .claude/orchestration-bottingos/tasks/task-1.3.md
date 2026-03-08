# Task 1.3: Encryption Module

## Objective

Build the master password flow and AES-256-GCM encryption module using the Web Crypto API. Users enter a master password on app launch, which derives an encryption key held in memory for encrypting/decrypting sensitive data (vault passwords, notes). The key is cleared after 5 minutes of idle time.

## Context

BottingOS stores sensitive data locally in SQLite - vault passwords, notes, and potentially API keys. This task builds the client-side encryption layer that protects this data. The encryption happens entirely in the frontend using the Web Crypto API (available in Tauri's WebView). No Rust-side encryption is needed for the MVP - the Web Crypto API is sufficient and avoids key serialization across the IPC boundary.

This task can be built in parallel with Tasks 1.1 and 1.2 since it has no dependencies. The encryption module will be consumed by the vault repository (Task 1.4) and the vault UI (Task 2.5).

## Dependencies

- None (independent module)

## Blocked By

- Nothing (can be built in parallel with all Phase 1 tasks)

## Research Findings

### Web Crypto API in Tauri WebView

The Web Crypto API (`crypto.subtle`) is available in both macOS WebKit and Windows WebView2. It provides:

- `PBKDF2` for key derivation from password
- `AES-GCM` for authenticated encryption (confidentiality + integrity)
- Cryptographically secure random number generation via `crypto.getRandomValues()`

### Key Derivation

PBKDF2 with 600,000 iterations (OWASP 2024 recommendation for PBKDF2-SHA256). Salt is 16 bytes, randomly generated on first password setup and stored in the `settings` table. The derived CryptoKey is non-extractable and held in memory only.

### Encryption Scheme

AES-256-GCM with 12-byte IV (nonce). IV is randomly generated per encryption operation. GCM provides authenticated encryption - the auth tag is automatically appended to the ciphertext. Each encrypted field has a companion `iv` column in the database.

### Master Password Verification

On first launch: user sets master password. Hash of password stored in settings table (using a separate PBKDF2 derivation with different salt) for verification on subsequent launches. The encryption key is derived from the same password but with a different salt.

### Idle Timeout

CryptoKey cleared from memory after 5 minutes of no user interaction. User must re-enter master password to continue. Track activity via mousemove, keydown, click events.

## Implementation Plan

### Step 1: Create Crypto Module (src/lib/crypto.ts)

```typescript
// Core encryption service
class CryptoService {
  private key: CryptoKey | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly PBKDF2_ITERATIONS = 600_000;

  // Derive encryption key from master password
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false, // non-extractable
      ["encrypt", "decrypt"],
    );
    this.key = key;
    this.resetIdleTimer();
    return key;
  }

  // Generate a password verification hash (separate from encryption key)
  async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }

  // Encrypt plaintext string
  async encrypt(plaintext: string): Promise<{ data: Uint8Array; iv: string }> {
    if (!this.key)
      throw new Error("Encryption key not available. Unlock the app first.");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      encoded,
    );
    return {
      data: new Uint8Array(encrypted),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  // Decrypt ciphertext
  async decrypt(data: Uint8Array, ivBase64: string): Promise<string> {
    if (!this.key)
      throw new Error("Encryption key not available. Unlock the app first.");
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.key,
      data,
    );
    return new TextDecoder().decode(decrypted);
  }

  // Generate random salt
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  // Convert salt to/from base64 for storage
  saltToBase64(salt: Uint8Array): string {
    return btoa(String.fromCharCode(...salt));
  }

  saltFromBase64(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }

  // Check if key is loaded
  isUnlocked(): boolean {
    return this.key !== null;
  }

  // Lock (clear key)
  lock(): void {
    this.key = null;
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  // Reset idle timer on user activity
  resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.lock(), this.IDLE_TIMEOUT_MS);
  }

  // Start listening for user activity
  startActivityTracking(): void {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, () => this.resetIdleTimer(), {
        passive: true,
      });
    });
  }

  // Stop listening
  stopActivityTracking(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }
}

// Singleton export
export const cryptoService = new CryptoService();
```

### Step 2: Create Master Password Dialog (src/components/master-password-dialog.tsx)

A modal dialog that:

1. On first launch (no password hash in settings): shows "Set Master Password" with password + confirm fields
2. On subsequent launches: shows "Unlock BottingOS" with single password field
3. Validates password against stored hash
4. Derives encryption key on success
5. Blocks all app navigation until unlocked

Use shadcn Dialog, Input, Button components. Style with zinc dark theme.

```tsx
"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cryptoService } from "@/lib/crypto";

interface MasterPasswordDialogProps {
  isFirstTime: boolean;
  onUnlock: () => void;
  onSetPassword: (password: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<boolean>;
}
```

Key behaviors:

- Dialog is not dismissible (no close button, no click-outside-to-close)
- Password field auto-focuses on mount
- Enter key submits
- Show error state on wrong password with shake animation
- Minimum 8 character requirement for new passwords
- Confirm password must match on first-time setup

### Step 3: Create Crypto Context Provider (src/components/providers/crypto-provider.tsx)

A React context that:

- Wraps the app and controls the master password gate
- Checks settings table for existing password hash on mount
- Shows MasterPasswordDialog until unlocked
- Provides `isUnlocked` state and `lock()` function to children
- Starts activity tracking after unlock
- Shows locked state overlay when key expires from idle

```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { cryptoService } from "@/lib/crypto";

interface CryptoContextValue {
  isUnlocked: boolean;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue>({
  isUnlocked: false,
  lock: () => {},
});

export const useCrypto = () => useContext(CryptoContext);
```

### Step 4: Integrate with App Layout

The CryptoProvider wraps the dashboard layout. Until the master password is entered, no content is shown - only the unlock dialog.

This integration happens in Task 2.1 (App Shell). For now, export the provider and document the integration point.

## Files to Create

- `src/lib/crypto.ts` - CryptoService class with encrypt/decrypt/deriveKey/hashPassword/lock/idle
- `src/components/master-password-dialog.tsx` - Unlock/setup password UI
- `src/components/providers/crypto-provider.tsx` - React context wrapping the app

## Files to Modify

- None directly. Integration with app layout happens in Task 2.1.

## Contracts

### Provides (for downstream)

- `cryptoService` singleton (from `src/lib/crypto.ts`):
  - `deriveKey(password, salt)` - returns CryptoKey
  - `hashPassword(password, salt)` - returns base64 hash for verification
  - `encrypt(plaintext)` - returns `{ data: Uint8Array, iv: string }`
  - `decrypt(data, iv)` - returns plaintext string
  - `isUnlocked()` - boolean check
  - `lock()` - clear key from memory
  - `generateSalt()` / `saltToBase64()` / `saltFromBase64()` - salt utilities
- `<CryptoProvider>` component (from `src/components/providers/crypto-provider.tsx`)
- `useCrypto()` hook - provides `isUnlocked` and `lock()` to any component
- `<MasterPasswordDialog>` component

### Consumes (from upstream)

- Settings table (from Task 1.1 schema) to store password hash and salt - but since this is parallel, use a fallback (localStorage or in-memory) until Task 1.4 settings repo is ready

## Acceptance Criteria

- [ ] PBKDF2 key derivation works with 600,000 iterations and SHA-256
- [ ] AES-256-GCM encryption produces different ciphertext each time (random IV)
- [ ] Decryption correctly recovers original plaintext
- [ ] Encrypting then decrypting with wrong key throws an error
- [ ] CryptoKey is non-extractable (cannot be exported from Web Crypto)
- [ ] Idle timeout clears key after 5 minutes of inactivity
- [ ] Activity events (mousemove, keydown, click) reset the idle timer
- [ ] Master password dialog blocks app content until unlocked
- [ ] First-time setup requires password confirmation
- [ ] Password verification rejects wrong passwords
- [ ] Lock function clears key and shows unlock dialog
- [ ] No plaintext passwords stored anywhere

## Testing Protocol

### Unit/Integration Tests

- Test encrypt/decrypt round-trip with known plaintext
- Test that different IVs produce different ciphertext for same plaintext
- Test that wrong key fails decryption (throws)
- Test password hash generation and verification
- Test salt generation produces 16 random bytes
- Test base64 encoding/decoding of salt

### Browser Testing (Playwright MCP)

- Load the app and verify master password dialog appears
- Set a master password (first time flow)
- Close and reopen - verify unlock dialog appears
- Enter wrong password - verify error state
- Enter correct password - verify app content shows
- Wait 5 minutes (or mock timer) - verify lock screen reappears

### Build/Lint/Type Checks

- `npx tsc --noEmit` passes
- No unused imports or variables

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md` (for dialog styling)

## Research Files to Read

- `.claude/orchestration-bottingos/research/desktop-app-architecture.md` (section 4 - secure storage)

## Git

- Branch: feat/1.3-encryption
- Commit message prefix: Task 1.3:
