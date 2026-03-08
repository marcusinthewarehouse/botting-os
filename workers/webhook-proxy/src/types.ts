export type {
  DiscordWebhookPayload,
  DiscordEmbed,
  EmbedField,
  CheckoutEvent,
} from "./parsers/types";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface WebhookTokenRow {
  user_id: string;
  discord_forward_url: string | null;
  is_active: boolean;
}
