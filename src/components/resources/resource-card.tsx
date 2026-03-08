'use client';

import {
  BookOpen, Bot, Globe, Bell, ShoppingBag, Wrench,
  Calendar, Link, Search, Users, GraduationCap,
  ExternalLink, Pencil, Trash2, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Resource } from '@/lib/db/types';

const iconMap: Record<string, LucideIcon> = {
  BookOpen, Bot, Globe, Bell, ShoppingBag, Wrench,
  Calendar, Link, Search, Users, GraduationCap,
};

const categoryColors: Record<string, string> = {
  'Getting Started': 'bg-green-500/15 text-green-400 border-green-500/25',
  'Bots': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Proxies': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Cook Groups': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Marketplaces': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'Tools': 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Education': 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  'Other': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

interface ResourceCardProps {
  resource: Resource;
  onOpen: (url: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ResourceCard({ resource, onOpen, onEdit, onDelete }: ResourceCardProps) {
  const Icon = (resource.icon && iconMap[resource.icon]) || ExternalLink;
  const colorClass = categoryColors[resource.category] || categoryColors['Other'];

  return (
    <button
      type="button"
      onClick={() => onOpen(resource.url)}
      className="group flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-black p-4 text-left transition-colors duration-150 hover:border-amber-500/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center justify-center size-8 rounded-md bg-zinc-800/50 shrink-0">
          <Icon className="size-4 text-zinc-400" />
        </div>
        <div className="flex items-center gap-1">
          {resource.isCustom && onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {resource.isCustom && onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors duration-150"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-zinc-50 truncate">{resource.name}</h3>
        {resource.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{resource.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', colorClass)}>
          {resource.category}
        </span>
        <ExternalLink className="size-3.5 text-zinc-600 group-hover:text-amber-500 transition-colors duration-150" />
      </div>
    </button>
  );
}
