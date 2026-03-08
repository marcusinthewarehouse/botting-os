"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Radio, Settings2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { ChannelTree } from "@/components/discord/channel-tree";
import { FilterBar, type FilterState } from "@/components/discord/filter-bar";
import {
  MessageFeed,
  type DiscordMessage,
} from "@/components/discord/message-feed";
import { DiscordService, type DiscordChannel } from "@/services/discord";
import * as settingsRepo from "@/lib/db/repositories/settings";
import { IS_TAURI } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MAX_MESSAGES = 2000;
const SESSION_KEY = "bottingos:discord_messages";

function loadSessionMessages(): DiscordMessage[] {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return [];
}

function saveSessionMessages(msgs: DiscordMessage[]) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(msgs.slice(-MAX_MESSAGES)),
    );
  } catch {
    /* ignore - storage full */
  }
}

interface StatusInfo {
  connected: boolean;
  message: string;
}

export default function DiscordPage() {
  const [messages, setMessages] =
    useState<DiscordMessage[]>(loadSessionMessages);
  const [status, setStatus] = useState<StatusInfo>({
    connected: false,
    message: "Not connected",
  });
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    author: "",
    botOnly: false,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const unlistenMsgRef = useRef<(() => void) | null>(null);
  const unlistenStatusRef = useRef<(() => void) | null>(null);
  const initialLoadDone = useRef(false);

  const unreadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const msg of messages) {
      counts.set(msg.channel_id, (counts.get(msg.channel_id) ?? 0) + 1);
    }
    return counts;
  }, [messages]);

  const channelNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const ch of channels) {
      map.set(ch.id, ch.name);
    }
    return map;
  }, [channels]);

  const filteredMessages = useMemo(() => {
    let result = messages;

    if (selectedChannel) {
      result = result.filter((m) => m.channel_id === selectedChannel);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((m) => m.content.toLowerCase().includes(q));
    }

    if (filters.author) {
      result = result.filter((m) => m.author_name === filters.author);
    }

    if (filters.botOnly) {
      result = result.filter((m) => m.author_bot);
    }

    return result;
  }, [messages, selectedChannel, filters]);

  const authors = useMemo(() => {
    const set = new Set<string>();
    for (const msg of messages) {
      set.add(msg.author_name);
    }
    return Array.from(set).sort();
  }, [messages]);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      setLoading(true);
      try {
        const [kwJson, discordStatus] = await Promise.all([
          settingsRepo.get("discord_keywords"),
          DiscordService.checkStatus(),
        ]);

        if (kwJson) {
          try {
            setKeywords(JSON.parse(kwJson));
          } catch {
            /* ignore */
          }
        }

        if (discordStatus.cdp_connected) {
          setStatus({ connected: true, message: "Connected to Discord" });
          const chs = await DiscordService.getChannels();
          setChannels(chs);
        }
      } catch (e) {
        console.error("Failed to initialize discord page:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!IS_TAURI) return;

    let cancelled = false;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      if (cancelled) return;

      const unMsg = await listen<DiscordMessage>("discord-message", (event) => {
        setMessages((prev) => {
          const next = [...prev, event.payload];
          const trimmed =
            next.length > MAX_MESSAGES
              ? next.slice(next.length - MAX_MESSAGES)
              : next;
          saveSessionMessages(trimmed);
          return trimmed;
        });
      });

      if (cancelled) {
        unMsg();
        return;
      }
      unlistenMsgRef.current = unMsg;

      const unStatus = await listen<StatusInfo>("discord-status", (event) => {
        setStatus(event.payload);
        if (event.payload.connected) {
          DiscordService.getChannels()
            .then((chs) => setChannels(chs))
            .catch(() => {});
        }
      });

      if (cancelled) {
        unStatus();
        unMsg();
        return;
      }
      unlistenStatusRef.current = unStatus;
    })();

    return () => {
      cancelled = true;
      unlistenMsgRef.current?.();
      unlistenStatusRef.current?.();
      unlistenMsgRef.current = null;
      unlistenStatusRef.current = null;
    };
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const s = await DiscordService.startCdp();
      if (s.cdp_connected) {
        setStatus({ connected: true, message: "Connected to Discord" });
        const chs = await DiscordService.getChannels();
        setChannels(chs);

        const savedChannels = await settingsRepo.get(
          "discord_monitored_channels",
        );
        let channelIds: string[] = [];
        if (savedChannels) {
          try {
            channelIds = JSON.parse(savedChannels);
          } catch {
            /* ignore */
          }
        }
        await DiscordService.startCapture(channelIds);
      }
    } catch (e) {
      console.error("Failed to connect:", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <PageHeader title="Discord" />
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          <Skeleton className="w-60 h-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Discord"
        description="Real-time message feed from monitored channels"
        actions={[
          {
            label: "Settings",
            onClick: () => {},
            variant: "outline" as const,
            icon: <Settings2 className="size-4" />,
          },
        ]}
      />

      {/* Override Settings action with Link */}
      <div className="absolute top-6 right-6">
        <Link
          href="/discord/settings"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 border border-border text-muted-foreground hover:bg-muted"
        >
          <Settings2 className="size-4" />
          Settings
        </Link>
      </div>

      {/* Connection banner */}
      {!status.connected && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-2 rounded-full",
                status.message.includes("Reconnecting")
                  ? "bg-primary/90"
                  : "bg-red-400",
              )}
            />
            <span className="text-sm text-muted-foreground">
              {status.message}
            </span>
          </div>
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            <Zap className="size-3.5" data-icon="inline-start" />
            {connecting ? "Connecting..." : "Connect"}
          </Button>
        </div>
      )}

      {status.connected && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2">
          <div className="size-2 rounded-full bg-green-400" />
          <span className="text-sm text-green-400">{status.message}</span>
          <Radio className="size-3 text-green-400 animate-pulse ml-auto" />
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[400px]">
        {/* Channel tree sidebar */}
        <div className="w-56 shrink-0 border border-border rounded-lg bg-card/30 overflow-y-auto p-2">
          {channels.length > 0 ? (
            <ChannelTree
              channels={channels}
              unreadCounts={unreadCounts}
              selectedChannel={selectedChannel}
              onSelect={setSelectedChannel}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="size-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No channels</p>
              <Link
                href="/discord/settings"
                className="text-xs text-primary hover:text-primary mt-1"
              >
                Configure
              </Link>
            </div>
          )}
        </div>

        {/* Main feed area */}
        <div className="flex-1 flex flex-col min-w-0 border border-border rounded-lg bg-card/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-border">
            <FilterBar
              authors={authors}
              filters={filters}
              onChange={setFilters}
            />
          </div>

          {filteredMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              {!status.connected ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Not connected"
                  description="Connect to Discord to start receiving messages in real-time."
                  action={{
                    label: "Connect Discord",
                    onClick: handleConnect,
                  }}
                />
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Messages will appear here as they arrive in your monitored channels."
                />
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No matching messages"
                  description="Try adjusting your filters or selecting a different channel."
                />
              )}
            </div>
          ) : (
            <MessageFeed
              messages={filteredMessages}
              keywords={keywords}
              channelNames={channelNames}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
