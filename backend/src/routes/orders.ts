import { Router } from "express";
import { prisma, broadcast } from "../index";

export const ordersRouter = Router();

// GET /api/orders
ordersRouter.get("/", async (req, res) => {
  try {
    const { status, site, limit = "50", offset = "0" } = req.query;
    const where: Record<string, string> = {};
    if (status) where.status = status as string;
    if (site) where.site = site as string;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /api/orders
ordersRouter.post("/", async (req, res) => {
  try {
    const { product, site, size, price, status, account, proxy, bot, profit } = req.body;
    if (!product || !site || price === undefined) {
      return res.status(400).json({ error: "product, site, and price are required" });
    }

    const order = await prisma.order.create({
      data: { product, site, size, price, status, account, proxy, bot, profit },
    });

    broadcast("order:created", order);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
});
