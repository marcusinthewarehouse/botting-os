import { Router } from "express";
import { prisma, broadcast } from "../index";

export const proxiesRouter = Router();

// GET /api/proxies
proxiesRouter.get("/", async (req, res) => {
  try {
    const { status, type, provider } = req.query;
    const where: Record<string, string> = {};
    if (status) where.status = status as string;
    if (type) where.type = type as string;
    if (provider) where.provider = provider as string;

    const proxies = await prisma.proxy.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ proxies, total: proxies.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch proxies" });
  }
});

// POST /api/proxies
proxiesRouter.post("/", async (req, res) => {
  try {
    const { host, port, username, password, provider, type, status, speed } = req.body;
    if (!host || !port) {
      return res.status(400).json({ error: "host and port are required" });
    }

    const proxy = await prisma.proxy.create({
      data: { host, port, username, password, provider, type, status, speed },
    });

    broadcast("proxy:created", proxy);
    res.status(201).json(proxy);
  } catch (error) {
    res.status(500).json({ error: "Failed to create proxy" });
  }
});

// PUT /api/proxies/:id
proxiesRouter.put("/:id", async (req, res) => {
  try {
    const proxy = await prisma.proxy.update({
      where: { id: req.params.id },
      data: req.body,
    });

    broadcast("proxy:updated", proxy);
    res.json(proxy);
  } catch (error) {
    res.status(404).json({ error: "Proxy not found" });
  }
});

// DELETE /api/proxies/:id
proxiesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.proxy.delete({ where: { id: req.params.id } });
    broadcast("proxy:deleted", { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: "Proxy not found" });
  }
});
