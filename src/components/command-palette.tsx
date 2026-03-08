'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calculator,
  TrendingUp,
  Mail,
  Lock,
  CreditCard,
  Plus,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

const navCommands = [
  { label: 'Go to Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Go to Calculator', icon: Calculator, path: '/calculator' },
  { label: 'Go to Tracker', icon: TrendingUp, path: '/tracker' },
  { label: 'Go to Emails', icon: Mail, path: '/emails' },
  { label: 'Go to Vault', icon: Lock, path: '/vault' },
  { label: 'Go to VCC', icon: CreditCard, path: '/vcc' },
];

const actionCommands = [
  { label: 'Quick Profit Check', icon: Calculator, action: '/calculator' },
  { label: 'Add Email', icon: Plus, action: '/emails' },
  { label: 'Lock Vault', icon: Lock, action: '__lock_vault__' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      if (value === '__lock_vault__') return;
      router.push(value);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navCommands.map((cmd) => (
            <CommandItem key={cmd.path} value={cmd.label} onSelect={() => handleSelect(cmd.path)}>
              <cmd.icon className="size-4 text-zinc-400" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem key={cmd.label} value={cmd.label} onSelect={() => handleSelect(cmd.action)}>
              <cmd.icon className="size-4 text-zinc-400" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
