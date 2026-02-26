import { Router } from "express";
import { prisma, broadcast } from "../index";

export const accountsRouter = Router();

// GET /api/accounts
accountsRouter.get("/", async (req, res) => {
  try {
    const { status, site } = req.query;
    const where: Record<string, string> = {};
    if (status) where.status = status as string;
    if (site) where.site = site as string;

    const accounts = await prisma.account.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ accounts, total: accounts.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// POST /api/accounts
accountsRouter.post("/", async (req, res) => {
  try {
    const { site, email, password, status, proxy, profile, notes } = req.body;
    if (!site || !email || !password) {
      return res.status(400).json({ error: "site, email, and password are required" });
    }

    const account = await prisma.account.create({
      data: { site, email, password, status, proxy, profile, notes },
    });

    broadcast("account:created", account);
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: "Failed to create account" });
  }
});
