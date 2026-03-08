'use client';

import { IS_TAURI } from '@/lib/db/client';

export interface DiscordStatus {
  running: boolean;
  debug_mode: boolean;
  cdp_connected: boolean;
  ws_url: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  guild_id: string;
  guild_name: string;
}

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args ?? {});
}

export const DiscordService = {
  async checkStatus(): Promise<DiscordStatus> {
    if (!IS_TAURI) {
      return { running: false, debug_mode: false, cdp_connected: false, ws_url: null };
    }
    try {
      return await tauriInvoke<DiscordStatus>('check_discord_status');
    } catch (e) {
      console.error('checkDiscordStatus failed:', e);
      return { running: false, debug_mode: false, cdp_connected: false, ws_url: null };
    }
  },

  async startCdp(): Promise<DiscordStatus> {
    return tauriInvoke<DiscordStatus>('start_discord_cdp');
  },

  async stopCdp(relaunchNormal = true): Promise<void> {
    await tauriInvoke('stop_discord_cdp', { relaunchNormal });
  },

  async getChannels(): Promise<DiscordChannel[]> {
    if (!IS_TAURI) return [];
    try {
      return await tauriInvoke<DiscordChannel[]>('get_discord_channels');
    } catch (e) {
      console.error('getDiscordChannels failed:', e);
      return [];
    }
  },

  async updateMonitoredChannels(channelIds: string[]): Promise<void> {
    await tauriInvoke('update_monitored_channels', { channelIds });
  },

  async startCapture(channelIds: string[]): Promise<void> {
    await tauriInvoke('start_cdp_capture', { channelIds });
  },

  async stopCapture(): Promise<void> {
    await tauriInvoke('stop_cdp_capture');
  },
};
