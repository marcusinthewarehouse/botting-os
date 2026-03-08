import type { DiscordEmbed, CheckoutEvent } from './types';
import { parseFuzzy } from './fuzzy';

export function parseWrath(embed: DiscordEmbed): Partial<CheckoutEvent> {
  return {
    ...parseFuzzy(embed),
    bot_name: 'wrath',
  };
}
