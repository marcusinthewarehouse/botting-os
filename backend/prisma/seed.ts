import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Orders
  await prisma.order.createMany({
    data: [
      { product: "Nike Dunk Low Panda", site: "nike.com", size: "10", price: 110, status: "success", bot: "Cybersole", profit: 85 },
      { product: "PS5 Digital Edition", site: "walmart.com", size: null, price: 399.99, status: "success", bot: "Wrath", profit: 150 },
      { product: "RTX 4090 FE", site: "bestbuy.com", size: null, price: 1599.99, status: "failed", bot: "Kodai", profit: null },
      { product: "New Balance 550 White Green", site: "newbalance.com", size: "9.5", price: 110, status: "success", bot: "Cybersole", profit: 60 },
      { product: "iPhone 15 Pro Max", site: "apple.com", size: "256GB", price: 1199, status: "pending", bot: "Wrath", profit: null },
      { product: "Yeezy Slide Onyx", site: "adidas.com", size: "11", price: 70, status: "success", bot: "MEKpreme", profit: 95 },
      { product: "Travis Scott Jordan 1 Low", site: "snkrs.nike.com", size: "10.5", price: 150, status: "cancelled", bot: "Kodai", profit: null },
      { product: "Bose QC Ultra Headphones", site: "target.com", size: null, price: 429, status: "success", bot: "Wrath", profit: 45 },
    ],
  });

  // Proxies
  await prisma.proxy.createMany({
    data: [
      { host: "proxy1.residential.io", port: 8080, username: "user1", password: "pass1", provider: "Bright Data", type: "residential", status: "active", speed: 120 },
      { host: "proxy2.residential.io", port: 8081, username: "user2", password: "pass2", provider: "Bright Data", type: "residential", status: "active", speed: 95 },
      { host: "dc1.fast-proxy.com", port: 3128, username: "dcuser", password: "dcpass", provider: "Proxy-Cheap", type: "datacenter", status: "active", speed: 25 },
      { host: "dc2.fast-proxy.com", port: 3129, username: "dcuser2", password: "dcpass2", provider: "Proxy-Cheap", type: "datacenter", status: "inactive", speed: 180 },
      { host: "isp1.premium-proxy.net", port: 9090, username: "ispuser", password: "isppass", provider: "Leaf Proxies", type: "isp", status: "active", speed: 45 },
      { host: "isp2.premium-proxy.net", port: 9091, username: "ispuser2", password: "isppass2", provider: "Leaf Proxies", type: "isp", status: "banned", speed: null },
    ],
  });

  // Accounts
  await prisma.account.createMany({
    data: [
      { site: "target", email: "bot_acct_001@gmail.com", password: "T4rg3t!2024", status: "active", proxy: "proxy1.residential.io:8080" },
      { site: "target", email: "bot_acct_002@gmail.com", password: "T4rg3t!2024b", status: "active", proxy: "proxy2.residential.io:8081" },
      { site: "walmart", email: "wm_checkout_01@outlook.com", password: "W4lm4rt#Secure", status: "active", proxy: "dc1.fast-proxy.com:3128" },
      { site: "walmart", email: "wm_checkout_02@outlook.com", password: "W4lm4rt#Secure2", status: "captcha", proxy: "dc2.fast-proxy.com:3129" },
      { site: "bestbuy", email: "bb_bot_alpha@yahoo.com", password: "B3stBuy!Go", status: "active", proxy: "isp1.premium-proxy.net:9090" },
      { site: "bestbuy", email: "bb_bot_beta@yahoo.com", password: "B3stBuy!Go2", status: "banned", proxy: "isp2.premium-proxy.net:9091" },
      { site: "nike", email: "snkrs_bot_01@gmail.com", password: "N1ke$nkrs!", status: "active" },
      { site: "adidas", email: "adi_checkout@proton.me", password: "4d1d4s#2024", status: "active" },
    ],
  });

  // Expenses
  await prisma.expense.createMany({
    data: [
      { category: "proxy", description: "Bright Data Residential - Monthly", amount: 300, recurring: true },
      { category: "proxy", description: "Proxy-Cheap DC Pack - Monthly", amount: 50, recurring: true },
      { category: "proxy", description: "Leaf Proxies ISP - Monthly", amount: 150, recurring: true },
      { category: "bot", description: "Cybersole Renewal", amount: 200, recurring: true },
      { category: "bot", description: "Wrath AIO License", amount: 350, recurring: false },
      { category: "bot", description: "Kodai Monthly", amount: 50, recurring: true },
      { category: "server", description: "AWS EC2 Bot Instances", amount: 120, recurring: true },
      { category: "account", description: "Gmail accounts bulk purchase", amount: 75, recurring: false },
    ],
  });

  // Settings
  await prisma.settings.createMany({
    data: [
      { id: "discord_webhook_url", key: "discord_webhook_url", value: "" },
      { id: "default_proxy_provider", key: "default_proxy_provider", value: "Bright Data" },
      { id: "auto_checkout", key: "auto_checkout", value: "true" },
      { id: "notification_sound", key: "notification_sound", value: "true" },
      { id: "theme", key: "theme", value: "dark" },
      { id: "max_concurrent_tasks", key: "max_concurrent_tasks", value: "10" },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
