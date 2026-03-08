import type { DiscordWebhookPayload } from "./types";

const BOT_PATTERNS: Record<string, string[]> = {
  cybersole: ["cybersole", "cyber"],
  valor: ["valor", "valoraio"],
  nsb: ["nsb", "nike shoe bot", "nikeshoebot"],
  wrath: ["wrath", "wrathio"],
  kodai: ["kodai", "kodaiaio"],
  balkobot: ["balko", "balkobot"],
  prism: ["prism", "prismaio"],
  aiobot: ["aio bot", "aiobot"],
};

export function detectBot(payload: DiscordWebhookPayload): string {
  const username = (payload.username ?? "").toLowerCase();
  const footerText = (payload.embeds?.[0]?.footer?.text ?? "").toLowerCase();

  for (const [bot, patterns] of Object.entries(BOT_PATTERNS)) {
    if (patterns.some((p) => footerText.includes(p) || username.includes(p))) {
      return bot;
    }
  }
  return "unknown";
}
