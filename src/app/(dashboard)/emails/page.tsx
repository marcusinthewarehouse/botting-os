'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PageHeader } from '@/components/ui/page-header';
import { PageTransition } from '@/components/page-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { BulkImport } from '@/components/emails/bulk-import';
import { ViewToggle } from '@/components/emails/view-toggle';
import { SourceView } from '@/components/emails/source-view';
import { RetailerView } from '@/components/emails/retailer-view';
import { emailsRepo } from '@/lib/db/repositories';
import { IS_TAURI } from '@/lib/db/client';
import type { Email } from '@/lib/db/types';

const PROVIDERS = ['icloud', 'gmail', 'outlook', 'yahoo'] as const;
const STATUSES = ['active', 'banned', 'suspended'] as const;

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<'source' | 'retailer'>('source');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);

  // Add form state
  const [addAddress, setAddAddress] = useState('');
  const [addIcloud, setAddIcloud] = useState('');
  const [addProvider, setAddProvider] = useState('icloud');
  const [addStatus, setAddStatus] = useState('active');
  const [addNotes, setAddNotes] = useState('');

  const loadEmails = useCallback(async () => {
    if (!IS_TAURI) {
      setLoaded(true);
      return;
    }
    try {
      const all = await emailsRepo.getAll();
      setEmails(all);
    } catch {
      // DB not available yet
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const existingAddresses = useMemo(
    () => new Set(emails.map((e) => e.address.toLowerCase())),
    [emails]
  );

  const handleBulkImport = useCallback(
    async (items: { address: string; icloudAccount: string | null }[]) => {
      try {
        await emailsRepo.bulkCreate(
          items.map((item) => ({
            address: item.address,
            icloudAccount: item.icloudAccount,
            provider: 'icloud',
            retailers: [],
            status: 'active',
            notes: null,
          }))
        );
        await loadEmails();
      } catch {
        // DB not available
      }
    },
    [loadEmails]
  );

  const handleAddSingle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!addAddress.trim()) return;
      try {
        await emailsRepo.create({
          address: addAddress.trim().toLowerCase(),
          icloudAccount: addIcloud.trim() || null,
          provider: addProvider,
          retailers: [],
          status: addStatus,
          notes: addNotes.trim() || null,
        });
        setAddAddress('');
        setAddIcloud('');
        setAddNotes('');
        setAddFormOpen(false);
        await loadEmails();
      } catch {
        // DB not available
      }
    },
    [addAddress, addIcloud, addProvider, addStatus, addNotes, loadEmails]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await emailsRepo.remove(id);
        await loadEmails();
      } catch {
        // DB not available
      }
    },
    [loadEmails]
  );

  const handleAddRetailer = useCallback(
    async (id: number, retailer: string) => {
      try {
        await emailsRepo.addRetailerTag(id, retailer);
        await loadEmails();
      } catch {
        // DB not available
      }
    },
    [loadEmails]
  );

  const handleRemoveRetailer = useCallback(
    async (id: number, retailer: string) => {
      try {
        await emailsRepo.removeRetailerTag(id, retailer);
        await loadEmails();
      } catch {
        // DB not available
      }
    },
    [loadEmails]
  );

  return (
    <PageTransition>
      <PageHeader
        title="Email Manager"
        description={`${emails.length} emails managed`}
        actions={[
          { label: 'Bulk Import', onClick: () => setBulkImportOpen(true), variant: 'outline' },
          { label: 'Add Email', onClick: () => setAddFormOpen(true) },
        ]}
      />

      {!loaded ? (
        <TableSkeleton rows={8} columns={4} />
      ) : emails.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No emails yet"
          description="Import your HideMyEmail addresses or add emails manually."
          action={{ label: 'Bulk Import', onClick: () => setBulkImportOpen(true) }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border-zinc-800 pl-9"
              />
            </div>
            <ViewToggle view={view} onViewChange={setView} />
          </div>

          {view === 'source' ? (
            <SourceView
              emails={emails}
              searchQuery={searchQuery}
              onDelete={handleDelete}
              onAddRetailer={handleAddRetailer}
              onRemoveRetailer={handleRemoveRetailer}
            />
          ) : (
            <RetailerView
              emails={emails}
              searchQuery={searchQuery}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <BulkImport
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        existingAddresses={existingAddresses}
        onImport={handleBulkImport}
      />

      <Sheet open={addFormOpen} onOpenChange={setAddFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Email</SheetTitle>
            <SheetDescription>Add a single email address.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAddSingle} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Email Address</Label>
              <Input
                placeholder="user@example.com"
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">iCloud Account (optional)</Label>
              <Input
                placeholder="user@icloud.com"
                value={addIcloud}
                onChange={(e) => setAddIcloud(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Provider</Label>
              <select
                value={addProvider}
                onChange={(e) => setAddProvider(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Status</Label>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Notes (optional)</Label>
              <Input
                placeholder="Notes..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Email
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
