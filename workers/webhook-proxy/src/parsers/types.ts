export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  fields?: EmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface CheckoutEvent {
  user_id: string;
  bot_name: string;
  product: string;
  sku: string | null;
  size: string | null;
  price: number | null;
  store: string;
  profile: string | null;
  proxy: string | null;
  order_number: string | null;
  mode: string | null;
  checkout_time: string | null;
  image_url: string | null;
  email: string | null;
  quantity: number;
  success: boolean;
  extras: Record<string, string>;
  raw_payload: DiscordWebhookPayload;
  received_at: string;
}

export interface ParsedFields {
  normalized: Record<string, string>;
  extras: Record<string, string>;
}
