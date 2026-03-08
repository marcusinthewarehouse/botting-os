import type { DiscordWebhookPayload, CheckoutEvent } from "./types";
import { detectBot } from "./detect";
import { parseCybersole } from "./cybersole";
import { parseValor } from "./valor";
import { parseNsb } from "./nsb";
import { parseWrath } from "./wrath";
import { parseKodai } from "./kodai";
import { parseFuzzy } from "./fuzzy";

export { detectBot } from "./detect";
export { normalizeFieldName, normalizeFields } from "./normalize";
export { parsePrice, isSuccessfulCheckout } from "./utils";
export type {
  DiscordWebhookPayload,
  DiscordEmbed,
  EmbedField,
  CheckoutEvent,
} from "./types";

const BOT_PARSERS: Record<
  string,
  (
    embed: NonNullable<DiscordWebhookPayload["embeds"]>[0],
  ) => Partial<CheckoutEvent>
> = {
  cybersole: parseCybersole,
  valor: parseValor,
  nsb: parseNsb,
  wrath: parseWrath,
  kodai: parseKodai,
};

export function parseWebhook(
  payload: DiscordWebhookPayload,
  userId: string,
): CheckoutEvent {
  const embed = payload.embeds?.[0];
  const botName = detectBot(payload);
  const parser = BOT_PARSERS[botName] ?? parseFuzzy;
  const parsed = embed ? parser(embed) : parseFuzzy({ fields: [] });

  return {
    user_id: userId,
    bot_name: parsed.bot_name ?? botName,
    product: parsed.product ?? "Unknown Product",
    sku: parsed.sku ?? null,
    size: parsed.size ?? null,
    price: parsed.price ?? null,
    store: parsed.store ?? "Unknown Store",
    profile: parsed.profile ?? null,
    proxy: parsed.proxy ?? null,
    order_number: parsed.order_number ?? null,
    mode: parsed.mode ?? null,
    checkout_time: parsed.checkout_time ?? null,
    image_url: parsed.image_url ?? null,
    email: parsed.email ?? null,
    quantity: parsed.quantity ?? 1,
    success: parsed.success ?? true,
    extras: parsed.extras ?? {},
    raw_payload: payload,
    received_at: new Date().toISOString(),
  };
}
