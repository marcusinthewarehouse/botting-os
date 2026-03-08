'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Hash, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelInfo {
  id: string;
  name: string;
  guild_id: string;
  guild_name: string;
}

interface GuildGroup {
  guildId: string;
  guildName: string;
  channels: ChannelInfo[];
}

interface ChannelTreeProps {
  channels: ChannelInfo[];
  unreadCounts: Map<string, number>;
  selectedChannel: string | null;
  onSelect: (channelId: string | null) => void;
}

function groupByGuild(channels: ChannelInfo[]): GuildGroup[] {
  const map = new Map<string, GuildGroup>();
  for (const ch of channels) {
    let group = map.get(ch.guild_id);
    if (!group) {
      group = { guildId: ch.guild_id, guildName: ch.guild_name, channels: [] };
      map.set(ch.guild_id, group);
    }
    group.channels.push(ch);
  }
  return Array.from(map.values()).sort((a, b) => a.guildName.localeCompare(b.guildName));
}

export function ChannelTree({ channels, unreadCounts, selectedChannel, onSelect }: ChannelTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const guilds = useMemo(() => groupByGuild(channels), [channels]);

  const totalUnread = useMemo(() => {
    let total = 0;
    for (const count of unreadCounts.values()) {
      total += count;
    }
    return total;
  }, [unreadCounts]);

  const toggleCollapse = useCallback((guildId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(guildId)) next.delete(guildId);
      else next.add(guildId);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center justify-between px-3 py-1.5 rounded-md transition-colors duration-150',
          selectedChannel === null
            ? 'bg-amber-500/15 text-amber-400 font-medium'
            : 'text-zinc-300 hover:bg-zinc-800/50'
        )}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          All Channels
        </span>
        {totalUnread > 0 && (
          <span className="text-[10px] font-mono tabular-nums bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {totalUnread}
          </span>
        )}
      </button>

      {guilds.map((guild) => {
        const isCollapsed = collapsed.has(guild.guildId);
        const guildUnread = guild.channels.reduce(
          (sum, ch) => sum + (unreadCounts.get(ch.id) ?? 0),
          0
        );

        return (
          <div key={guild.guildId}>
            <button
              type="button"
              onClick={() => toggleCollapse(guild.guildId)}
              className="flex items-center justify-between w-full px-3 py-1 text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
            >
              <span className="flex items-center gap-1">
                {isCollapsed ? (
                  <ChevronRight className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider truncate">
                  {guild.guildName}
                </span>
              </span>
              {guildUnread > 0 && (
                <span className="text-[10px] font-mono tabular-nums text-amber-400">
                  {guildUnread}
                </span>
              )}
            </button>

            {!isCollapsed &&
              guild.channels.map((ch) => {
                const count = unreadCounts.get(ch.id) ?? 0;
                const isActive = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onSelect(ch.id)}
                    className={cn(
                      'flex items-center justify-between w-full pl-7 pr-3 py-1 rounded-md transition-colors duration-150',
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Hash className="size-3.5 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-mono tabular-nums bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
