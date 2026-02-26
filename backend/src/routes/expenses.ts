import { Router } from "express";
import { prisma, broadcast } from "../index";

export const expensesRouter = Router();

// GET /api/expenses
expensesRouter.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const where: Record<string, string> = {};
    if (category) where.category = category as string;

    const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total, count: expenses.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// POST /api/expenses
expensesRouter.post("/", async (req, res) => {
  try {
    const { category, description, amount, date, recurring } = req.body;
    if (!category || !description || amount === undefined) {
      return res.status(400).json({ error: "category, description, and amount are required" });
    }

    const expense = await prisma.expense.create({
      data: { category, description, amount, date: date ? new Date(date) : undefined, recurring },
    });

    broadcast("expense:created", expense);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to create expense" });
  }
});
