import { db } from "../client";
import { resources } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import type { Resource } from "../types";

export async function getAll(): Promise<Resource[]> {
  return db.select().from(resources).orderBy(desc(resources.createdAt));
}

export async function create(data: {
  name: string;
  url: string;
  description?: string;
  category: string;
  icon?: string;
  isCustom?: boolean;
}): Promise<void> {
  await db.insert(resources).values({
    name: data.name,
    url: data.url,
    description: data.description ?? null,
    category: data.category,
    icon: data.icon ?? null,
    isCustom: data.isCustom ?? true,
    createdAt: new Date(),
  });
}

export async function update(
  id: number,
  data: Partial<{
    name: string;
    url: string;
    description: string;
    category: string;
    icon: string;
  }>,
): Promise<void> {
  await db.update(resources).set(data).where(eq(resources.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(resources).where(eq(resources.id, id));
}

export async function count(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(resources);
  return result[0]?.count ?? 0;
}

export async function seedIfEmpty(): Promise<void> {
  const total = await count();
  if (total > 0) return;

  const now = new Date();
  const seedData = [
    {
      name: "BotBroker Blog",
      url: "https://botbroker.io/blog",
      description: "Guides, market analysis, and botting news from BotBroker.",
      category: "Getting Started",
      icon: "BookOpen",
    },
    {
      name: "Sneaker Bot Guide",
      url: "https://botbroker.io/guides",
      description: "Comprehensive overview of sneaker bots and how they work.",
      category: "Getting Started",
      icon: "GraduationCap",
    },
    {
      name: "r/sneakerbots",
      url: "https://reddit.com/r/sneakerbots",
      description: "Reddit community for sneaker bot discussion and help.",
      category: "Getting Started",
      icon: "Users",
    },
    {
      name: "Cybersole",
      url: "https://cybersole.io",
      description: "Premium sneaker bot for Nike, Shopify, Supreme, and more.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "Valor",
      url: "https://valoraio.com",
      description: "All-in-one bot supporting 100+ sites.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "NSB",
      url: "https://nsbsupreme.com",
      description: "Nike Shoe Bot - supports Nike, Adidas, Shopify, and more.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "Wrath",
      url: "https://wrathbots.com",
      description: "High-performance bot for Shopify and Footsites.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "Kodai",
      url: "https://kodai.io",
      description: "Sneaker bot supporting Shopify, Footsites, and Supreme.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "Mek AIO",
      url: "https://mekaio.com",
      description: "All-in-one bot for sneakers and retail.",
      category: "Bots",
      icon: "Bot",
    },
    {
      name: "Leaf Proxies",
      url: "https://leafproxies.com",
      description: "Residential and datacenter proxies for botting.",
      category: "Proxies",
      icon: "Globe",
    },
    {
      name: "Oculus Proxies",
      url: "https://oculusproxies.com",
      description: "Fast residential proxies with dashboard management.",
      category: "Proxies",
      icon: "Globe",
    },
    {
      name: "Scarlet Proxies",
      url: "https://scarletproxies.com",
      description: "Premium ISP and datacenter proxies.",
      category: "Proxies",
      icon: "Globe",
    },
    {
      name: "Hex Proxies",
      url: "https://hexproxies.com",
      description: "Residential, ISP, and datacenter proxy plans.",
      category: "Proxies",
      icon: "Globe",
    },
    {
      name: "Notify",
      url: "https://notify.org",
      description: "Premium cook group with early links and monitors.",
      category: "Cook Groups",
      icon: "Bell",
    },
    {
      name: "GFNF",
      url: "https://gofornofees.com",
      description: "Go For No Fees - cook group for reselling guidance.",
      category: "Cook Groups",
      icon: "Bell",
    },
    {
      name: "Juiced",
      url: "https://juiced.co",
      description: "Cook group with release info, early links, and tools.",
      category: "Cook Groups",
      icon: "Bell",
    },
    {
      name: "StockX",
      url: "https://stockx.com",
      description:
        "Live marketplace for sneakers, streetwear, and electronics.",
      category: "Marketplaces",
      icon: "ShoppingBag",
    },
    {
      name: "GOAT",
      url: "https://goat.com",
      description: "Marketplace for authenticated sneakers.",
      category: "Marketplaces",
      icon: "ShoppingBag",
    },
    {
      name: "eBay",
      url: "https://ebay.com",
      description: "Global online marketplace for buying and selling.",
      category: "Marketplaces",
      icon: "ShoppingBag",
    },
    {
      name: "Mercari",
      url: "https://mercari.com",
      description: "Selling platform for sneakers and streetwear.",
      category: "Marketplaces",
      icon: "ShoppingBag",
    },
    {
      name: "Alias",
      url: "https://alias.gg",
      description: "Sneaker marketplace with low fees.",
      category: "Marketplaces",
      icon: "ShoppingBag",
    },
    {
      name: "AYCD Toolbox",
      url: "https://aycd.io",
      description:
        "Suite of tools including OneClick, Gmail Creator, and more.",
      category: "Tools",
      icon: "Wrench",
    },
    {
      name: "Ayakashi",
      url: "https://ayakashi.io",
      description: "Account generation and management tools.",
      category: "Tools",
      icon: "Wrench",
    },
    {
      name: "Hyper Tools",
      url: "https://hyper.co",
      description: "Drop automation and link management tools.",
      category: "Tools",
      icon: "Wrench",
    },
    {
      name: "Resell Calendar",
      url: "https://resellcalendar.com",
      description: "Upcoming sneaker release dates and retail info.",
      category: "Education",
      icon: "Calendar",
    },
    {
      name: "SoleLinks",
      url: "https://solelinks.com",
      description: "Sneaker release links and restock information.",
      category: "Education",
      icon: "Link",
    },
    {
      name: "Sole Retriever",
      url: "https://soleretriever.com",
      description: "Raffle and release info aggregator.",
      category: "Education",
      icon: "Search",
    },
  ];

  await db.insert(resources).values(
    seedData.map((r) => ({
      ...r,
      isCustom: false,
      createdAt: now,
    })),
  );
}
