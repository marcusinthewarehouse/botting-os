import { Router } from "express";
import { prisma } from "../index";

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get("/", async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany();
    const mapped = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /api/settings
settingsRouter.put("/", async (req, res) => {
  try {
    const entries = Object.entries(req.body) as [string, string][];
    if (entries.length === 0) {
      return res.status(400).json({ error: "No settings provided" });
    }

    await Promise.all(
      entries.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { id: key, key, value: String(value) },
        })
      )
    );

    const settings = await prisma.settings.findMany();
    const mapped = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});
