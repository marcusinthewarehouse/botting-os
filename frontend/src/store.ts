import { create } from 'zustand';

export interface Order {
  id: number;
  store: string;
  product: string;
  size: string;
  price: number;
  profit: number;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
  failureReason?: string;
}

export interface Proxy {
  id: number;
  ip: string;
  port: number;
  location: string;
  health: 'green' | 'yellow' | 'red';
  uptime: number;
  responseTime: number | null;
  lastChecked: string;
}

export interface Account {
  id: number;
  email: string;
  store: string;
  age: number;
  healthScore: number;
  restrictions: string;
  status: 'active' | 'dead';
}

export interface ProfitData {
  date: string;
  profit: number;
  orders: number;
}

export interface StoreConfig {
  orders: Order[];
  proxies: Proxy[];
  accounts: Account[];
  profitData: ProfitData[];
  totalProfit: number;
  activeOrders: number;
  deadProxies: number;
}

const mockOrders: Order[] = [
  { id: 1, store: 'Nike', product: 'Jordan 1 Retro Chicago', size: '10', price: 150, profit: 55, status: 'success', timestamp: '2 min ago' },
  { id: 2, store: 'Supreme', product: 'Box Logo Hoodie FW24', size: 'M', price: 200, profit: 85, status: 'success', timestamp: '3 min ago' },
  { id: 3, store: 'eBay', product: 'Pokemon Charizard PSA 10', size: 'N/A', price: 500, profit: 180, status: 'success', timestamp: '5 min ago' },
  { id: 4, store: 'Foot Locker', product: 'New Balance 550', size: '11', price: 120, profit: 42, status: 'pending', timestamp: '7 min ago' },
  { id: 5, store: 'Nike', product: 'Dunk Low UNC', size: '9', price: 110, profit: 38, status: 'failed', timestamp: '8 min ago', failureReason: 'Captcha wall' },
  { id: 6, store: 'Adidas', product: 'Yeezy 350 Zebra', size: '9.5', price: 220, profit: 95, status: 'success', timestamp: '10 min ago' },
  { id: 7, store: 'Supreme', product: 'TNF Expedition Jacket', size: 'L', price: 180, profit: 72, status: 'success', timestamp: '12 min ago' },
  { id: 8, store: 'Pokemon Center', product: 'Pikachu Promo Box', size: 'N/A', price: 85, profit: 28, status: 'success', timestamp: '14 min ago' },
  { id: 9, store: 'Nike', product: 'SB Dunk High StrangeLove', size: '10.5', price: 175, profit: 65, status: 'success', timestamp: '16 min ago' },
  { id: 10, store: 'Finish Line', product: 'Air Max 90 Surplus', size: '12', price: 140, profit: 45, status: 'success', timestamp: '18 min ago' },
  { id: 11, store: 'Supreme', product: 'Backpack SS24', size: 'One Size', price: 148, profit: 58, status: 'pending', timestamp: '20 min ago' },
  { id: 12, store: 'eBay', product: 'MTG Black Lotus', size: 'N/A', price: 2500, profit: 450, status: 'success', timestamp: '22 min ago' },
  { id: 13, store: 'Foot Locker', product: 'Puma RS-X', size: '8', price: 95, profit: 32, status: 'success', timestamp: '24 min ago' },
  { id: 14, store: 'Nike', product: 'Travis Scott SB Dunk', size: '11', price: 280, profit: 110, status: 'failed', timestamp: '26 min ago', failureReason: 'Account flagged' },
  { id: 15, store: 'Supreme', product: 'Stone Island Jacket', size: 'XL', price: 249, profit: 95, status: 'success', timestamp: '28 min ago' },
  { id: 16, store: 'Pokemon Center', product: 'Evolving Skies Booster Box', size: 'N/A', price: 145, profit: 52, status: 'success', timestamp: '30 min ago' },
  { id: 17, store: 'Adidas', product: 'Ultraboost 22', size: '10', price: 180, profit: 68, status: 'success', timestamp: '32 min ago' },
  { id: 18, store: 'Nike', product: 'Blazer Mid Vintage', size: '9.5', price: 125, profit: 44, status: 'success', timestamp: '34 min ago' },
  { id: 19, store: 'eBay', product: 'Nintendo Switch OLED (Sealed)', size: 'N/A', price: 350, profit: 95, status: 'failed', timestamp: '36 min ago', failureReason: 'Out of stock' },
  { id: 20, store: 'Finish Line', product: 'New Balance 990v6', size: '11', price: 165, profit: 58, status: 'success', timestamp: '38 min ago' },
  { id: 21, store: 'Supreme', product: 'Tote Bag SS24', size: 'One Size', price: 58, profit: 22, status: 'success', timestamp: '40 min ago' },
  { id: 22, store: 'Nike', product: 'Air Force 1 OG', size: '10', price: 110, profit: 38, status: 'success', timestamp: '42 min ago' },
  { id: 23, store: 'eBay', product: 'Graded Sports Card PSA 9', size: 'N/A', price: 425, profit: 155, status: 'success', timestamp: '44 min ago' },
  { id: 24, store: 'Foot Locker', product: 'Asics Gel-Lyte III', size: '9.5', price: 130, profit: 46, status: 'pending', timestamp: '46 min ago' },
];

const mockProxies: Proxy[] = [
  { id: 1, ip: '192.168.1.1', port: 8080, location: 'US-East', health: 'green', uptime: 99.8, responseTime: 42, lastChecked: '1 min ago' },
  { id: 2, ip: '192.168.1.2', port: 8080, location: 'US-West', health: 'green', uptime: 99.5, responseTime: 48, lastChecked: '1 min ago' },
  { id: 3, ip: '192.168.1.3', port: 8080, location: 'US-Central', health: 'green', uptime: 99.9, responseTime: 45, lastChecked: '2 min ago' },
  { id: 4, ip: '192.168.1.4', port: 8080, location: 'EU-West', health: 'yellow', uptime: 94.2, responseTime: 125, lastChecked: '2 min ago' },
  { id: 5, ip: '192.168.1.5', port: 8080, location: 'Asia-Pacific', health: 'yellow', uptime: 91.3, responseTime: 185, lastChecked: '3 min ago' },
  { id: 6, ip: '192.168.1.6', port: 8080, location: 'US-South', health: 'green', uptime: 98.7, responseTime: 52, lastChecked: '1 min ago' },
  { id: 7, ip: '192.168.1.7', port: 8080, location: 'US-East', health: 'red', uptime: 0, responseTime: null, lastChecked: '5 min ago' },
  { id: 8, ip: '192.168.1.8', port: 8080, location: 'EU-Central', health: 'green', uptime: 99.1, responseTime: 58, lastChecked: '2 min ago' },
];

const mockAccounts: Account[] = [
  { id: 1, email: 'acc1@gmail.com', store: 'Nike', age: 45, healthScore: 94, restrictions: 'none', status: 'active' },
  { id: 2, email: 'acc2@outlook.com', store: 'Supreme', age: 120, healthScore: 82, restrictions: 'none', status: 'active' },
  { id: 3, email: 'acc3@gmail.com', store: 'Nike', age: 15, healthScore: 45, restrictions: 'flagged', status: 'dead' },
  { id: 4, email: 'acc4@yahoo.com', store: 'Foot Locker', age: 89, healthScore: 78, restrictions: 'none', status: 'active' },
  { id: 5, email: 'acc5@protonmail.com', store: 'Adidas', age: 60, healthScore: 88, restrictions: 'captcha', status: 'active' },
  { id: 6, email: 'acc6@gmail.com', store: 'eBay', age: 200, healthScore: 96, restrictions: 'none', status: 'active' },
  { id: 7, email: 'acc7@hotmail.com', store: 'Supreme', age: 30, healthScore: 65, restrictions: 'email_verification', status: 'active' },
  { id: 8, email: 'acc8@gmail.com', store: 'Nike', age: 5, healthScore: 32, restrictions: 'flagged', status: 'dead' },
  { id: 9, email: 'acc9@outlook.com', store: 'Finish Line', age: 75, healthScore: 85, restrictions: 'none', status: 'active' },
  { id: 10, email: 'acc10@gmail.com', store: 'Pokemon', age: 120, healthScore: 92, restrictions: 'none', status: 'active' },
];

const mockProfitData: ProfitData[] = [
  { date: 'Mon', profit: 320, orders: 12 },
  { date: 'Tue', profit: 450, orders: 15 },
  { date: 'Wed', profit: 380, orders: 14 },
  { date: 'Thu', profit: 620, orders: 20 },
  { date: 'Fri', profit: 850, orders: 26 },
  { date: 'Sat', profit: 1200, orders: 35 },
  { date: 'Sun', profit: 1050, orders: 32 },
];

export const useStore = create<StoreConfig>(() => ({
  orders: mockOrders,
  proxies: mockProxies,
  accounts: mockAccounts,
  profitData: mockProfitData,
  totalProfit: 1245,
  activeOrders: 10,
  deadProxies: 1,
}));
