import { Router } from "express";
import { prisma } from "../index";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  try {
    const [
      totalOrders,
      successOrders,
      failedOrders,
      activeProxies,
      totalProxies,
      activeAccounts,
      totalAccounts,
      orders,
      expenses,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "success" } }),
      prisma.order.count({ where: { status: "failed" } }),
      prisma.proxy.count({ where: { status: "active" } }),
      prisma.proxy.count(),
      prisma.account.count({ where: { status: "active" } }),
      prisma.account.count(),
      prisma.order.findMany({
        where: { status: "success", profit: { not: null } },
        select: { profit: true },
      }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const totalExpenses = expenses._sum.amount || 0;

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      stats: {
        totalOrders,
        successOrders,
        failedOrders,
        successRate: totalOrders > 0 ? ((successOrders / totalOrders) * 100).toFixed(1) : "0",
        activeProxies,
        totalProxies,
        activeAccounts,
        totalAccounts,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
      },
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});
