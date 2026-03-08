"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Hash, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DiscordChannel } from "@/services/discord";

interface GuildGroup {
  guildId: string;
  guildName: string;
  channels: DiscordChannel[];
}

interface ChannelSelectorProps {
  channels: DiscordChannel[];
  selected: string[];
  monitorAll: boolean;
  onChange: (channelIds: string[]) => void;
  onMonitorAllChange: (value: boolean) => void;
  disabled?: boolean;
}

function groupByGuild(channels: DiscordChannel[]): GuildGroup[] {
  const map = new Map<string, GuildGroup>();
  for (const ch of channels) {
    let group = map.get(ch.guild_id);
    if (!group) {
      group = { guildId: ch.guild_id, guildName: ch.guild_name, channels: [] };
      map.set(ch.guild_id, group);
    }
    group.channels.push(ch);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.guildName.localeCompare(b.guildName),
  );
}

type CheckState = "all" | "none" | "indeterminate";

function getGuildCheckState(
  guild: GuildGroup,
  selected: Set<string>,
): CheckState {
  let hasSelected = false;
  let hasUnselected = false;
  for (const ch of guild.channels) {
    if (selected.has(ch.id)) {
      hasSelected = true;
    } else {
      hasUnselected = true;
    }
    if (hasSelected && hasUnselected) return "indeterminate";
  }
  return hasSelected ? "all" : "none";
}

export function ChannelSelector({
  channels,
  selected,
  monitorAll,
  onChange,
  onMonitorAllChange,
  disabled = false,
}: ChannelSelectorProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const guilds = useMemo(() => groupByGuild(channels), [channels]);

  const filteredGuilds = useMemo(() => {
    if (!search.trim()) return guilds;
    const q = search.toLowerCase();
    return guilds
      .map((g) => ({
        ...g,
        channels: g.channels.filter(
          (ch) =>
            ch.name.toLowerCase().includes(q) ||
            g.guildName.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.channels.length > 0);
  }, [guilds, search]);

  const toggleCollapse = useCallback((guildId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(guildId)) {
        next.delete(guildId);
      } else {
        next.add(guildId);
      }
      return next;
    });
  }, []);

  const toggleGuild = useCallback(
    (guild: GuildGroup) => {
      const state = getGuildCheckState(guild, selectedSet);
      const guildChannelIds = new Set(guild.channels.map((ch) => ch.id));

      if (state === "all") {
        onChange(selected.filter((id) => !guildChannelIds.has(id)));
      } else {
        const merged = new Set(selected);
        for (const ch of guild.channels) {
          merged.add(ch.id);
        }
        onChange(Array.from(merged));
      }
    },
    [selected, selectedSet, onChange],
  );

  const toggleChannel = useCallback(
    (channelId: string) => {
      if (selectedSet.has(channelId)) {
        onChange(selected.filter((id) => id !== channelId));
      } else {
        onChange([...selected, channelId]);
      }
    },
    [selected, selectedSet, onChange],
  );

  const totalChannels = channels.length;
  const selectedCount = selected.length;

  return (
    <div
      className={cn("space-y-3", disabled && "opacity-50 pointer-events-none")}
    >
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={monitorAll}
            onChange={(e) => onMonitorAllChange(e.target.checked)}
            className="size-4 rounded border-border bg-card text-primary accent-primary"
          />
          <span className="text-sm font-medium text-foreground">
            Monitor All Channels
          </span>
        </label>
        {!monitorAll && totalChannels > 0 && (
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {selectedCount}/{totalChannels} monitored
          </span>
        )}
      </div>

      {!monitorAll && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border h-8 text-sm"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
            {filteredGuilds.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {channels.length === 0 ? "No channels found" : "No matches"}
              </p>
            )}

            {filteredGuilds.map((guild) => {
              const isCollapsed = collapsed.has(guild.guildId);
              const checkState = getGuildCheckState(guild, selectedSet);
              const guildSelected = guild.channels.filter((ch) =>
                selectedSet.has(ch.id),
              ).length;

              return (
                <div key={guild.guildId}>
                  <div className="flex items-center gap-1 py-1 rounded hover:bg-muted/50 transition-colors duration-150">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(guild.guildId)}
                      className="p-0.5 text-muted-foreground hover:text-muted-foreground"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>

                    <input
                      type="checkbox"
                      checked={checkState === "all"}
                      ref={(el) => {
                        if (el)
                          el.indeterminate = checkState === "indeterminate";
                      }}
                      onChange={() => toggleGuild(guild)}
                      className="size-4 rounded border-border bg-card text-primary accent-primary"
                    />

                    <button
                      type="button"
                      onClick={() => toggleCollapse(guild.guildId)}
                      className="flex-1 text-left flex items-center gap-2 pl-1"
                    >
                      <span className="text-sm font-medium text-foreground/80 truncate">
                        {guild.guildName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                        {guildSelected}/{guild.channels.length}
                      </span>
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="ml-6 space-y-0.5">
                      {guild.channels.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors duration-150"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(ch.id)}
                            onChange={() => toggleChannel(ch.id)}
                            className="size-3.5 rounded border-border bg-card text-primary accent-primary"
                          />
                          <Hash className="size-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate">
                            {ch.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
                            {ch.id}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
