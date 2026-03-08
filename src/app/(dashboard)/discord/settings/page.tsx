"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Radio,
  RefreshCw,
  Settings2,
  Unplug,
  X,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { ChannelSelector } from "@/components/discord/channel-selector";
import {
  DiscordService,
  type DiscordChannel,
  type DiscordStatus,
} from "@/services/discord";
import * as settingsRepo from "@/lib/db/repositories/settings";
import { cn } from "@/lib/utils";

const SETTINGS_KEY_CHANNELS = "discord_monitored_channels";
const SETTINGS_KEY_KEYWORDS = "discord_keywords";
const SETTINGS_KEY_MONITOR_ALL = "discord_monitor_all";

export default function DiscordSettingsPage() {
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [monitorAll, setMonitorAll] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialLoadDone = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const [channelsJson, keywordsJson, monitorAllVal] = await Promise.all([
        settingsRepo.get(SETTINGS_KEY_CHANNELS),
        settingsRepo.get(SETTINGS_KEY_KEYWORDS),
        settingsRepo.get(SETTINGS_KEY_MONITOR_ALL),
      ]);

      if (channelsJson) {
        try {
          setSelectedChannels(JSON.parse(channelsJson));
        } catch {
          /* ignore parse errors */
        }
      }
      if (keywordsJson) {
        try {
          setKeywords(JSON.parse(keywordsJson));
        } catch {
          /* ignore parse errors */
        }
      }
      if (monitorAllVal === "true") {
        setMonitorAll(true);
      }
    } catch (e) {
      console.error("Failed to load discord settings:", e);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    const s = await DiscordService.checkStatus();
    setStatus(s);
    return s;
  }, []);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const chs = await DiscordService.getChannels();
      setChannels(chs);
    } catch (e) {
      console.error("Failed to load channels:", e);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      setLoading(true);
      await loadSettings();
      const s = await checkStatus();
      if (s.cdp_connected) {
        await loadChannels();
      }
      setLoading(false);
    })();
  }, [loadSettings, checkStatus, loadChannels]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const s = await DiscordService.startCdp();
      setStatus(s);
      if (s.cdp_connected) {
        await loadChannels();
      }
    } catch (e) {
      console.error("Failed to connect:", e);
    } finally {
      setConnecting(false);
    }
  }, [loadChannels]);

  const handleDisconnect = useCallback(async () => {
    try {
      await DiscordService.stopCdp(true);
      setStatus({
        running: false,
        debug_mode: false,
        cdp_connected: false,
        ws_url: null,
      });
      setChannels([]);
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  }, []);

  const handleRefreshChannels = useCallback(async () => {
    await loadChannels();
  }, [loadChannels]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await settingsRepo.set(
        SETTINGS_KEY_CHANNELS,
        JSON.stringify(selectedChannels),
      );
      await settingsRepo.set(SETTINGS_KEY_KEYWORDS, JSON.stringify(keywords));
      await settingsRepo.set(
        SETTINGS_KEY_MONITOR_ALL,
        monitorAll ? "true" : "false",
      );

      if (status?.cdp_connected) {
        const ids = monitorAll ? [] : selectedChannels;
        await DiscordService.updateMonitoredChannels(ids);
      }

      setDirty(false);
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      setSaving(false);
    }
  }, [selectedChannels, keywords, monitorAll, status]);

  const handleSelectedChange = useCallback((ids: string[]) => {
    setSelectedChannels(ids);
    setDirty(true);
  }, []);

  const handleMonitorAllChange = useCallback((value: boolean) => {
    setMonitorAll(value);
    setDirty(true);
  }, []);

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) return;
    setKeywords((prev) => [...prev, trimmed]);
    setKeywordInput("");
    setDirty(true);
  }, [keywordInput, keywords]);

  const removeKeyword = useCallback((keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
    setDirty(true);
  }, []);

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addKeyword();
      }
    },
    [addKeyword],
  );

  const isConnected = status?.cdp_connected ?? false;

  if (loading) {
    return (
      <PageTransition>
        <PageHeader title="Discord Settings" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Discord Settings"
        description="Configure Discord monitoring and channel filters"
      />

      <div className="space-y-6 max-w-2xl">
        {/* Connection Status */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "size-2.5 rounded-full",
                  isConnected ? "bg-green-400" : "bg-muted-foreground",
                )}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isConnected ? "Connected to Discord" : "Not connected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? "CDP session active - channels available"
                    : status?.running
                      ? "Discord is running but CDP is not active"
                      : "Discord is not running"}
                </p>
              </div>
            </div>

            {isConnected ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Unplug className="size-3.5" data-icon="inline-start" />
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                <Zap className="size-3.5" data-icon="inline-start" />
                {connecting ? "Connecting..." : "Connect Discord"}
              </Button>
            )}
          </div>
        </Card>

        {/* Monitored Channels */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                Monitored Channels
              </h3>
            </div>
            {isConnected && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleRefreshChannels}
                disabled={loadingChannels}
              >
                <RefreshCw
                  className={cn("size-3.5", loadingChannels && "animate-spin")}
                />
              </Button>
            )}
          </div>

          {!isConnected ? (
            <EmptyState
              icon={MessageSquare}
              title="Not connected"
              description="Connect to Discord to browse and select channels to monitor."
              className="py-8"
            />
          ) : loadingChannels && channels.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : channels.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No channels found"
              description="Could not enumerate channels from Discord. Make sure you are logged in."
              className="py-8"
            />
          ) : (
            <ChannelSelector
              channels={channels}
              selected={selectedChannels}
              monitorAll={monitorAll}
              onChange={handleSelectedChange}
              onMonitorAllChange={handleMonitorAllChange}
            />
          )}
        </Card>

        {/* Keywords */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Keywords</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Add keywords to highlight in the Discord feed. Messages matching
            these terms will be flagged.
          </p>

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Add keyword..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              className="bg-card border-border h-8 text-sm flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addKeyword}
              disabled={!keywordInput.trim()}
            >
              Add
            </Button>
          </div>

          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-xs"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-primary/60 hover:text-primary transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No keywords set</p>
          )}
        </Card>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {dirty && (
            <span className="text-xs text-primary">Unsaved changes</span>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
