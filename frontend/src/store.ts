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
}

export interface Proxy {
  id: number;
  ip: string;
  health: 'green' | 'yellow' | 'red';
  uptime: number;
  responseTime: number | null;
  lastChecked: string;
}

export interface Account {
  id: number;
  name: string;
  email: string;
  store: string;
  status: 'active' | 'inactive' | 'banned';
  health: number;
  orders: number;
  successRate: number;
}

export interface ProfitData {
  date: string;
  profit: number;
  orders: number;
}

export interface Store {
  orders: Order[];
  proxies: Proxy[];
  accounts: Account[];
  profitData: ProfitData[];
  totalProfit: number;
  activeOrders: number;
  deadProxies: number;
}

const mockOrders: Order[] = [
  { id: 1, store: 'Nike', product: 'Jordan 1 Retro', size: '10', price: 150, profit: 45, status: 'success', timestamp: '2 min ago' },
  { id: 2, store: 'Supreme', product: 'Box Logo Hoodie', size: 'M', price: 200, profit: 80, status: 'pending', timestamp: '5 min ago' },
  { id: 3, store: 'Adidas', product: 'Yeezy 350', size: '9.5', price: 220, profit: 95, status: 'success', timestamp: '8 min ago' },
  { id: 4, store: 'Foot Locker', product: 'Air Max 90', size: '11', price: 130, profit: 35, status: 'success', timestamp: '12 min ago' },
  { id: 5, store: 'Finish Line', product: 'New Balance 990', size: '10', price: 175, profit: 60, status: 'failed', timestamp: '15 min ago' },
];

const mockProxies: Proxy[] = [
  { id: 1, ip: '192.168.1.1', health: 'green', uptime: 99.8, responseTime: 45, lastChecked: '1 min ago' },
  { id: 2, ip: '192.168.1.2', health: 'green', uptime: 99.5, responseTime: 52, lastChecked: '1 min ago' },
  { id: 3, ip: '192.168.1.3', health: 'yellow', uptime: 92.1, responseTime: 120, lastChecked: '2 min ago' },
  { id: 4, ip: '192.168.1.4', health: 'yellow', uptime: 88.5, responseTime: 180, lastChecked: '3 min ago' },
  { id: 5, ip: '192.168.1.5', health: 'red', uptime: 0, responseTime: null, lastChecked: '5 min ago' },
];

const mockAccounts: Account[] = [
  { id: 1, name: 'Nike_Bot_01', email: 'nike1@example.com', store: 'Nike', status: 'active', health: 98, orders: 145, successRate: 89 },
  { id: 2, name: 'Supreme_Bot_01', email: 'supreme1@example.com', store: 'Supreme', status: 'active', health: 95, orders: 87, successRate: 76 },
  { id: 3, name: 'Adidas_Bot_01', email: 'adidas1@example.com', store: 'Adidas', status: 'active', health: 92, orders: 203, successRate: 81 },
  { id: 4, name: 'Foot_Locker_01', email: 'ftl1@example.com', store: 'Foot Locker', status: 'inactive', health: 45, orders: 52, successRate: 62 },
  { id: 5, name: 'Finish_Line_01', email: 'fl1@example.com', store: 'Finish Line', status: 'banned', health: 0, orders: 18, successRate: 28 },
];

const mockProfitData: ProfitData[] = [
  { date: 'Mon', profit: 340, orders: 8 },
  { date: 'Tue', profit: 420, orders: 12 },
  { date: 'Wed', profit: 280, orders: 6 },
  { date: 'Thu', profit: 590, orders: 15 },
  { date: 'Fri', profit: 720, orders: 18 },
  { date: 'Sat', profit: 1050, orders: 24 },
  { date: 'Sun', profit: 880, orders: 20 },
];

export const useStore = create<Store>(() => ({
  orders: mockOrders,
  proxies: mockProxies,
  accounts: mockAccounts,
  profitData: mockProfitData,
  totalProfit: 4280,
  activeOrders: 47,
  deadProxies: 2,
}));
