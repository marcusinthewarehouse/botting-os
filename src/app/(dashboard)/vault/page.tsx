'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Search, ShieldAlert, KeyRound } from 'lucide-react';
import { useCrypto } from '@/components/providers/crypto-provider';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';
import { Input } from '@/components/ui/input';
import { EntryCard } from '@/components/vault/entry-card';
import { EntryForm } from '@/components/vault/entry-form';
import * as vaultRepo from '@/lib/db/repositories/vault';
import type { DecryptedVaultEntry } from '@/lib/db/repositories/vault';

export default function VaultPage() {
  const { isUnlocked, lock } = useCrypto();
  const [entries, setEntries] = useState<DecryptedVaultEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [panicHide, setPanicHide] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DecryptedVaultEntry | null>(null);

  const loadEntries = useCallback(async () => {
    if (!isUnlocked) return;
    try {
      const all = await vaultRepo.getAll();
      setEntries(all);
    } catch {
      setEntries([]);
    } finally {
      setLoaded(true);
    }
  }, [isUnlocked]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Panic hide: Cmd+Shift+H
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setPanicHide(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) => e.site.toLowerCase().includes(q) || e.username.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const handleCreate = useCallback(
    async (data: { site: string; username: string; password: string; notes?: string }) => {
      await vaultRepo.create(data);
      await loadEntries();
    },
    [loadEntries]
  );

  const handleUpdate = useCallback(
    async (data: { site: string; username: string; password: string; notes?: string }) => {
      if (!editingEntry) return;
      await vaultRepo.update(editingEntry.id, data);
      setEditingEntry(null);
      await loadEntries();
    },
    [editingEntry, loadEntries]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await vaultRepo.remove(id);
      await loadEntries();
    },
    [loadEntries]
  );

  const handleLock = useCallback(() => {
    setEntries([]);
    setLoaded(false);
    setPanicHide(false);
    setSearch('');
    lock();
  }, [lock]);

  // Locked state
  if (!isUnlocked) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-zinc-800/50 mb-6">
            <Lock className="size-8 text-zinc-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-medium text-zinc-50 mb-2">Vault Locked</h2>
          <p className="text-sm text-zinc-500 max-w-sm">
            Enter your master password to access stored credentials.
            The vault is encrypted with AES-256-GCM.
          </p>
        </div>
      </PageTransition>
    );
  }

  // Panic hide overlay
  if (panicHide) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-red-500/10 mb-6">
            <ShieldAlert className="size-8 text-red-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-medium text-zinc-50 mb-2">Vault Hidden</h2>
          <p className="text-sm text-zinc-500 max-w-sm mb-6">
            All credentials are hidden. Click below to restore the view.
          </p>
          <button
            onClick={() => setPanicHide(false)}
            className="text-sm text-amber-500 hover:text-amber-400 transition-colors duration-150"
          >
            Restore vault view
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Password Vault"
        description="Encrypted credential storage"
        actions={[
          {
            label: 'Lock',
            onClick: handleLock,
            variant: 'outline',
            icon: <Lock className="size-4" />,
          },
          {
            label: 'Add Entry',
            onClick: () => setFormOpen(true),
            icon: <Plus className="size-4" />,
          },
        ]}
      />

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Search by site or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
      )}

      {/* Entry grid */}
      {!loaded ? (
        <CardSkeleton count={6} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials yet"
          description="Add your first entry to start managing passwords securely."
          action={{ label: 'Add Entry', onClick: () => setFormOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="Try a different search term."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => {
                setEditingEntry(entry);
              }}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {entries.length > 0 && (
        <p className="text-xs text-zinc-600 mt-6">
          {entries.length} credential{entries.length !== 1 ? 's' : ''} stored - AES-256-GCM encrypted
        </p>
      )}

      {/* Add form */}
      <EntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Edit form */}
      {editingEntry && (
        <EntryForm
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null);
          }}
          onSubmit={handleUpdate}
          initialValues={{
            site: editingEntry.site,
            username: editingEntry.username,
            password: editingEntry.password,
            notes: editingEntry.notes ?? undefined,
          }}
          isEditing
        />
      )}
    </PageTransition>
  );
}
