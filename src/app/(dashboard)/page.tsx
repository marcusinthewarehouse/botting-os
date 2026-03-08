'use client';

import {
  TrendingUp,
  Package,
  CreditCard,
  Mail,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/ui/page-header';

const kpiCards = [
  { title: 'Total Profit', value: '--', icon: TrendingUp },
  { title: 'Active Emails', value: '--', icon: Mail },
  { title: 'VCCs Tracked', value: '--', icon: CreditCard },
  { title: 'Inventory Items', value: '--', icon: Package },
];

export default function DashboardPage() {
  return (
    <PageTransition>
      <PageHeader title="Dashboard" description="Your command center for botting operations." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} title={card.title} value={card.value} />
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-white/[0.06] bg-black p-8 text-center">
        <p className="text-sm text-zinc-500">Connect data to see stats</p>
        <p className="text-xs text-zinc-600 mt-1">
          Press <kbd className="mx-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Cmd+K</kbd> to navigate
        </p>
      </div>
    </PageTransition>
  );
}
