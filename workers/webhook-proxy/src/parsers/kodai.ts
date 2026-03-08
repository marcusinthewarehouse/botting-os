import type { DiscordEmbed, CheckoutEvent } from "./types";
import { parseFuzzy } from "./fuzzy";

export function parseKodai(embed: DiscordEmbed): Partial<CheckoutEvent> {
  return {
    ...parseFuzzy(embed),
    bot_name: "kodai",
  };
}
