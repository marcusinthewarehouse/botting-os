import { Router } from "express";
import { prisma, broadcast } from "../index";

export const discordRouter = Router();

// POST /api/discord/webhook - Receive Discord webhook events
discordRouter.post("/webhook", async (req, res) => {
  try {
    const { type, content, embeds, author, channel } = req.body;

    // Parse bot checkout notifications from Discord
    // Common format: bot posts embed with product, size, price info
    if (embeds && embeds.length > 0) {
      const embed = embeds[0];
      const fields = embed.fields || [];

      const getField = (name: string) =>
        fields.find((f: { name: string; value: string }) =>
          f.name.toLowerCase().includes(name.toLowerCase())
        )?.value;

      const product = embed.title || getField("product") || "Unknown Product";
      const site = getField("site") || getField("store") || "unknown";
      const size = getField("size");
      const price = parseFloat(getField("price")?.replace(/[^0-9.]/g, "") || "0");

      if (product !== "Unknown Product" || price > 0) {
        const order = await prisma.order.create({
          data: {
            product,
            site,
            size,
            price,
            status: "success",
            bot: author?.username || channel || "discord",
          },
        });

        broadcast("order:created", order);
        broadcast("discord:checkout", { order, raw: req.body });

        return res.status(201).json({ success: true, order });
      }
    }

    // Forward raw webhook data via WebSocket for frontend display
    broadcast("discord:message", {
      type,
      content,
      author,
      channel,
      embeds,
      receivedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Discord webhook error:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});
