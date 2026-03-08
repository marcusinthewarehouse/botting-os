import { db } from "../client";
import { vaultEntries } from "../schema";
import { eq, desc } from "drizzle-orm";
import { cryptoService } from "@/lib/crypto";
import type { VaultEntry } from "../types";

function assertUnlocked(): void {
  if (!cryptoService.isUnlocked()) {
    throw new Error("Vault is locked");
  }
}

type DecryptedVaultEntry = Omit<
  VaultEntry,
  "passwordCiphertext" | "passwordIv" | "notesCiphertext" | "notesIv"
> & {
  password: string;
  notes: string | null;
};

async function decryptEntry(entry: VaultEntry): Promise<DecryptedVaultEntry> {
  const password = await cryptoService.decrypt(
    entry.passwordCiphertext as Uint8Array,
    entry.passwordIv,
  );
  let notes: string | null = null;
  if (entry.notesCiphertext && entry.notesIv) {
    notes = await cryptoService.decrypt(
      entry.notesCiphertext as Uint8Array,
      entry.notesIv,
    );
  }
  const {
    passwordCiphertext: _pc,
    passwordIv: _pi,
    notesCiphertext: _nc,
    notesIv: _ni,
    ...rest
  } = entry;
  return { ...rest, password, notes };
}

export async function getAll(): Promise<DecryptedVaultEntry[]> {
  assertUnlocked();
  const rows = await db
    .select()
    .from(vaultEntries)
    .orderBy(desc(vaultEntries.createdAt));
  return Promise.all(rows.map(decryptEntry));
}

export async function getById(
  id: number,
): Promise<DecryptedVaultEntry | undefined> {
  assertUnlocked();
  const rows = await db
    .select()
    .from(vaultEntries)
    .where(eq(vaultEntries.id, id));
  if (!rows[0]) return undefined;
  return decryptEntry(rows[0]);
}

export async function create(data: {
  site: string;
  username: string;
  password: string;
  notes?: string;
}): Promise<void> {
  assertUnlocked();
  const { data: passwordCiphertext, iv: passwordIv } =
    await cryptoService.encrypt(data.password);
  let notesCiphertext: Uint8Array | null = null;
  let notesIv: string | null = null;
  if (data.notes) {
    const encrypted = await cryptoService.encrypt(data.notes);
    notesCiphertext = encrypted.data;
    notesIv = encrypted.iv;
  }
  const now = new Date();
  await db.insert(vaultEntries).values({
    site: data.site,
    username: data.username,
    passwordCiphertext,
    passwordIv,
    notesCiphertext,
    notesIv,
    createdAt: now,
    updatedAt: now,
  });
}

export async function update(
  id: number,
  data: Partial<{
    site: string;
    username: string;
    password: string;
    notes: string;
  }>,
): Promise<void> {
  assertUnlocked();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.site !== undefined) updates.site = data.site;
  if (data.username !== undefined) updates.username = data.username;
  if (data.password !== undefined) {
    const { data: ciphertext, iv } = await cryptoService.encrypt(data.password);
    updates.passwordCiphertext = ciphertext;
    updates.passwordIv = iv;
  }
  if (data.notes !== undefined) {
    const { data: ciphertext, iv } = await cryptoService.encrypt(data.notes);
    updates.notesCiphertext = ciphertext;
    updates.notesIv = iv;
  }
  await db.update(vaultEntries).set(updates).where(eq(vaultEntries.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(vaultEntries).where(eq(vaultEntries.id, id));
}

export type { DecryptedVaultEntry };
