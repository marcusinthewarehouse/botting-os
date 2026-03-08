'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus, Search } from 'lucide-react';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { VccForm } from '@/components/vcc/vcc-form';
import { VccTable } from '@/components/vcc/vcc-table';
import type { VccWithEmail } from '@/components/vcc/vcc-table';
import * as vccsRepo from '@/lib/db/repositories/vccs';
import * as emailsRepo from '@/lib/db/repositories/emails';
import type { Vcc, Email } from '@/lib/db/types';

const STATUSES = ['All', 'active', 'used', 'closed', 'flagged'] as const;
const PROVIDERS = ['All', 'Privacy.com', 'Capital One', 'Citi', 'Apple Pay', 'Other'] as const;

export default function VccPage() {
  const [vccs, setVccs] = useState<VccWithEmail[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingVcc, setEditingVcc] = useState<Vcc | null>(null);

  const loadData = useCallback(async () => {
    const [allVccs, allEmails] = await Promise.all([
      vccsRepo.getAll(),
      emailsRepo.getAll(),
    ]);
    setEmails(allEmails);
    const emailMap = new Map(allEmails.map((e) => [e.id, e]));
    const withEmails: VccWithEmail[] = allVccs.map((vcc) => ({
      ...vcc,
      linkedEmail: vcc.linkedAccountId ? emailMap.get(vcc.linkedAccountId) : undefined,
    }));
    setVccs(withEmails);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = vccs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          (v.label ?? '').toLowerCase().includes(q) ||
          v.lastFour.includes(q) ||
          (v.linkedEmail?.address ?? '').toLowerCase().includes(q)
      );
    }
    if (providerFilter !== 'All') {
      result = result.filter((v) => v.provider === providerFilter);
    }
    if (statusFilter !== 'All') {
      result = result.filter((v) => v.status === statusFilter);
    }
    return result;
  }, [vccs, search, providerFilter, statusFilter]);

  const counts = useMemo(() => {
    const total = vccs.length;
    const active = vccs.filter((v) => v.status === 'active').length;
    const used = vccs.filter((v) => v.status === 'used').length;
    const flagged = vccs.filter((v) => v.status === 'flagged').length;
    return { total, active, used, flagged };
  }, [vccs]);

  const handleCreate = useCallback(
    async (data: { provider: string; lastFour: string; label: string; linkedAccountId: number | null; status: string }) => {
      await vccsRepo.create({
        provider: data.provider,
        lastFour: data.lastFour,
        label: data.label,
        linkedAccountId: data.linkedAccountId,
        status: data.status,
      });
      await loadData();
    },
    [loadData]
  );

  const handleUpdate = useCallback(
    async (data: { provider: string; lastFour: string; label: string; linkedAccountId: number | null; status: string }) => {
      if (!editingVcc) return;
      await vccsRepo.update(editingVcc.id, {
        provider: data.provider,
        lastFour: data.lastFour,
        label: data.label,
        linkedAccountId: data.linkedAccountId,
        status: data.status,
      });
      setEditingVcc(null);
      await loadData();
    },
    [editingVcc, loadData]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await vccsRepo.remove(id);
      await loadData();
    },
    [loadData]
  );

  const handleStatusChange = useCallback(
    async (id: number, status: string) => {
      await vccsRepo.update(id, { status });
      await loadData();
    },
    [loadData]
  );

  const selectClass = 'rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50';

  return (
    <PageTransition>
      <PageHeader
        title="VCC Tracker"
        description="Track virtual credit cards and linked accounts"
        actions={[
          {
            label: 'Add VCC',
            onClick: () => setFormOpen(true),
            icon: <Plus className="size-4" />,
          },
        ]}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total VCCs" value={String(counts.total)} />
        <KpiCard title="Active" value={String(counts.active)} />
        <KpiCard title="Used" value={String(counts.used)} />
        <KpiCard title="Flagged" value={String(counts.flagged)} />
      </div>

      {/* Filter bar */}
      {vccs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <Input
              placeholder="Search by label, last 4, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className={selectClass}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p === 'All' ? 'All Providers' : p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table or empty state */}
      {vccs.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No VCCs yet"
          description="Add a virtual credit card to start tracking usage and linked accounts."
          action={{ label: 'Add VCC', onClick: () => setFormOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="Try a different search term or adjust your filters."
        />
      ) : (
        <VccTable
          vccs={filtered}
          onEdit={(id) => {
            const vcc = vccs.find((v) => v.id === id);
            if (vcc) setEditingVcc(vcc);
          }}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Footer */}
      {vccs.length > 0 && (
        <p className="text-xs text-zinc-600 mt-6">
          {vccs.length} card{vccs.length !== 1 ? 's' : ''} tracked
        </p>
      )}

      {/* Add form */}
      <VccForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        emails={emails}
      />

      {/* Edit form */}
      {editingVcc && (
        <VccForm
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingVcc(null);
          }}
          onSubmit={handleUpdate}
          emails={emails}
          initialValues={{
            provider: editingVcc.provider ?? 'Privacy.com',
            lastFour: editingVcc.lastFour,
            label: editingVcc.label ?? '',
            linkedAccountId: editingVcc.linkedAccountId ?? null,
            status: editingVcc.status ?? 'active',
          }}
          isEditing
        />
      )}
    </PageTransition>
  );
}
