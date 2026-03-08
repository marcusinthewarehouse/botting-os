"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, Bot, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id: string | null;
  content: string;
  author_name: string;
  author_bot: boolean;
  timestamp: string;
  embeds: unknown[];
  attachments: unknown[];
}

interface MessageFeedProps {
  messages: DiscordMessage[];
  keywords: string[];
  channelNames: Map<string, string>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightKeywords(text: string, keywords: string[]): ReactNode {
  if (!keywords.length || !text) return text;
  const pattern = keywords.map(escapeRegex).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function authorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  return colors[Math.abs(hash) % colors.length];
}

function relativeTime(ts: string): string {
  try {
    const date = new Date(ts);
    const now = Date.now();
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}

interface EmbedData {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  thumbnail?: { url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

function EmbedCard({ embed }: { embed: EmbedData }) {
  const borderColor = embed.color
    ? `#${embed.color.toString(16).padStart(6, "0")}`
    : "#3f3f46";

  return (
    <div
      className="mt-1.5 rounded-md border border-border bg-card/50 p-3 max-w-md"
      style={{ borderLeftColor: borderColor, borderLeftWidth: 3 }}
    >
      {embed.title && (
        <p className="text-sm font-medium text-foreground/80 mb-1">
          {embed.url ? (
            <span className="text-blue-400">{embed.title}</span>
          ) : (
            embed.title
          )}
        </p>
      )}
      {embed.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {embed.description}
        </p>
      )}
      {embed.fields && embed.fields.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mt-2">
          {embed.fields.slice(0, 6).map((f, i) => (
            <div key={i} className={f.inline ? "" : "col-span-2"}>
              <p className="text-[10px] text-muted-foreground font-medium">
                {f.name}
              </p>
              <p className="text-xs text-muted-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageFeed({
  messages,
  keywords,
  channelNames,
}: MessageFeedProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 20,
  });

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      isAtBottomRef.current = true;
    }
  }, [messages.length, virtualizer]);

  useEffect(() => {
    if (messages.length > prevCountRef.current && isAtBottomRef.current) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, virtualizer]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const threshold = 100;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  }, []);

  const items = virtualizer.getVirtualItems();

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="h-full overflow-auto"
      >
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {items.map((virtualRow) => {
            const msg = messages[virtualRow.index];
            if (!msg) return null;
            const channelName = channelNames.get(msg.channel_id);
            const embeds = (msg.embeds ?? []) as EmbedData[];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div className="flex gap-3 px-4 py-2 hover:bg-muted/30 transition-colors duration-100">
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0 mt-0.5",
                      authorColor(msg.author_name),
                    )}
                  >
                    {msg.author_name[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {msg.author_name}
                      </span>
                      {msg.author_bot && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-1 py-0 rounded">
                          <Bot className="size-2.5" />
                          BOT
                        </span>
                      )}
                      {channelName && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Hash className="size-2.5" />
                          {channelName}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums ml-auto shrink-0">
                        {relativeTime(msg.timestamp)}
                      </span>
                    </div>

                    {msg.content && (
                      <p className="text-sm text-muted-foreground mt-0.5 break-words whitespace-pre-wrap">
                        {highlightKeywords(msg.content, keywords)}
                      </p>
                    )}

                    {embeds.length > 0 &&
                      embeds
                        .slice(0, 3)
                        .map((embed, i) => <EmbedCard key={i} embed={embed} />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isAtBottomRef.current && messages.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            <ArrowDown className="size-3.5" data-icon="inline-start" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
}
