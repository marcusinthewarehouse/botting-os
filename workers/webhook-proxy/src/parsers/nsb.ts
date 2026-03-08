import type { DiscordEmbed, CheckoutEvent } from "./types";
import { normalizeFields } from "./normalize";
import { parsePrice, isSuccessfulCheckout } from "./utils";

export function parseNsb(embed: DiscordEmbed): Partial<CheckoutEvent> {
  const fields = embed.fields ?? [];
  const { normalized, extras } = normalizeFields(fields);

  const priceRaw = normalized["price"];
  const quantityRaw = normalized["quantity"];

  return {
    bot_name: "nsb",
    product: normalized["product"] ?? "Unknown Product",
    sku: normalized["sku"] ?? null,
    size: normalized["size"] ?? null,
    price: priceRaw ? parsePrice(priceRaw) : null,
    store: normalized["store"] ?? "Unknown Store",
    profile: normalized["profile"] ?? null,
    proxy: normalized["proxy"] ?? null,
    order_number: normalized["orderNumber"] ?? null,
    mode: normalized["mode"] ?? null,
    checkout_time: normalized["checkoutTime"] ?? null,
    image_url: embed.thumbnail?.url ?? null,
    email: normalized["email"] ?? null,
    quantity: quantityRaw ? parseInt(quantityRaw, 10) || 1 : 1,
    success: isSuccessfulCheckout(embed),
    extras,
  };
}
