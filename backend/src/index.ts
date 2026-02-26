import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import { dashboardRouter } from "./routes/dashboard";
import { ordersRouter } from "./routes/orders";
import { proxiesRouter } from "./routes/proxies";
import { accountsRouter } from "./routes/accounts";
import { expensesRouter } from "./routes/expenses";
import { settingsRouter } from "./routes/settings";
import { discordRouter } from "./routes/discord";

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send(JSON.stringify({ event: "connected", data: { message: "Botting OS Backend" } }));
  ws.on("close", () => console.log("WebSocket client disconnected"));
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/proxies", proxiesRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/discord", discordRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Botting OS Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
