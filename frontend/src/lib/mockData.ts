/** Demo data for market / trading UI until Kiosk & WS are wired */

import type { PersonalityKey } from "@/lib/personality";

export interface MarketListing {
  id: string;
  name: string;
  suiObjectId: string;
  priceSui: number;
  talent: number;
  experienceLevel: number;
  winRate: number;
  listedAt: string;
  personality: Record<PersonalityKey, number>;
  isRare?: boolean;
  isMine?: boolean;
  isSold?: boolean;
  isLocked?: boolean;
}

export const MOCK_MARKET_LISTINGS: MarketListing[] = [
  {
    id: "m1",
    name: "阿暴",
    suiObjectId: "0xabc1",
    priceSui: 5.0,
    talent: 1,
    experienceLevel: 42,
    winRate: 0.58,
    listedAt: "3小时前",
    personality: { boldness: 90, patience: 45, intuition: 60, focus: 55, contrarian: 40 },
    isRare: true,
  },
  {
    id: "m2",
    name: "阿稳",
    suiObjectId: "0xabc2",
    priceSui: 3.5,
    talent: 0,
    experienceLevel: 65,
    winRate: 0.62,
    listedAt: "1天前",
    personality: { boldness: 40, patience: 85, intuition: 50, focus: 70, contrarian: 35 },
  },
  {
    id: "m3",
    name: "阿鬼",
    suiObjectId: "0xabc3",
    priceSui: 8.0,
    talent: 2,
    experienceLevel: 78,
    winRate: 0.71,
    listedAt: "5小时前",
    personality: { boldness: 55, patience: 50, intuition: 95, focus: 60, contrarian: 80 },
    isRare: true,
  },
  {
    id: "m4",
    name: "阿福",
    suiObjectId: "0xabc4",
    priceSui: 2.0,
    talent: 0,
    experienceLevel: 25,
    winRate: 0.48,
    listedAt: "2天前",
    personality: { boldness: 50, patience: 50, intuition: 50, focus: 50, contrarian: 50 },
  },
  {
    id: "m5",
    name: "小暴",
    suiObjectId: "0xabc5",
    priceSui: 1.2,
    talent: 0,
    experienceLevel: 18,
    winRate: 0.44,
    listedAt: "6小时前",
    personality: { boldness: 85, patience: 30, intuition: 55, focus: 40, contrarian: 45 },
  },
  {
    id: "m6",
    name: "大胖",
    suiObjectId: "0xabc6",
    priceSui: 4.0,
    talent: 3,
    experienceLevel: 55,
    winRate: 0.55,
    listedAt: "12小时前",
    personality: { boldness: 35, patience: 90, intuition: 45, focus: 65, contrarian: 30 },
  },
  {
    id: "m7",
    name: "黑子",
    suiObjectId: "0xabc7",
    priceSui: 6.0,
    talent: 0,
    experienceLevel: 72,
    winRate: 0.66,
    listedAt: "4小时前",
    personality: { boldness: 60, patience: 55, intuition: 70, focus: 50, contrarian: 80 },
  },
  {
    id: "m8",
    name: "竹叶",
    suiObjectId: "0xabc8",
    priceSui: 0.8,
    talent: 0,
    experienceLevel: 12,
    winRate: 0.41,
    listedAt: "3天前",
    personality: { boldness: 45, patience: 60, intuition: 55, focus: 88, contrarian: 42 },
  },
];

export interface TradingPool {
  id: string;
  name: string;
  description: string;
  liquidity: string;
  volume24h: string;
  price: string;
  change24h: number;
  fee?: string;
  recommended?: boolean;
}

export const MOCK_POOLS: TradingPool[] = [
  {
    id: "cetus-btc-sui",
    name: "Cetus BTC/SUI",
    description: "SUI 上最大 BTC 池",
    liquidity: "$2.1M",
    volume24h: "$580K",
    price: "$59,500",
    change24h: 5.3,
    fee: "0.05%",
  },
  {
    id: "cetus-eth-sui",
    name: "Cetus ETH/SUI",
    description: "ETH 流动性池",
    liquidity: "$1.8M",
    volume24h: "$420K",
    price: "$3,200",
    change24h: 2.1,
  },
  {
    id: "deepbook-sui-usdc",
    name: "DeepBook SUI/USDC",
    description: "SUI 原生订单簿",
    liquidity: "$890K",
    volume24h: "$210K",
    price: "$1.05",
    change24h: -1.2,
    recommended: true,
  },
  {
    id: "bluefin-sui-btc",
    name: "Bluefin SUI/BTC",
    description: "永续合约 3×杠杆",
    liquidity: "$1.5M",
    volume24h: "$350K",
    price: "$59,500",
    change24h: 0.8,
  },
  {
    id: "turbos-sui-usdt",
    name: "Turbos SUI/USDT",
    description: "低滑点稳定币池",
    liquidity: "$620K",
    volume24h: "$150K",
    price: "$1.00",
    change24h: 0.01,
  },
];

export interface Position {
  asset: string;
  side: "Long" | "Short";
  quantity: string;
  pnl: number;
  pnlPct: number;
  entryPrice: string;
}

export const MOCK_POSITIONS: Position[] = [
  { asset: "BTC/USD", side: "Long", quantity: "0.085 BTC", pnl: 120, pnlPct: 0.2, entryPrice: "$58,820" },
  { asset: "ETH/USD", side: "Long", quantity: "0.5 ETH", pnl: -50, pnlPct: -1.5, entryPrice: "$3,250" },
];

export interface OrderBookRow {
  price: number;
  quantity: number;
  total: number;
  side: "ask" | "bid";
}

export function generateOrderBook(mid = 59500): { asks: OrderBookRow[]; bids: OrderBookRow[] } {
  const asks: OrderBookRow[] = [];
  const bids: OrderBookRow[] = [];
  for (let i = 0; i < 6; i++) {
    asks.push({
      price: mid + 10 + i * 10,
      quantity: 0.5 + i * 0.3,
      total: (mid + 10 + i * 10) * (0.5 + i * 0.3),
      side: "ask",
    });
    bids.push({
      price: mid - 10 - i * 10,
      quantity: 0.4 + i * 0.35,
      total: (mid - 10 - i * 10) * (0.4 + i * 0.35),
      side: "bid",
    });
  }
  return { asks, bids };
}

export interface TradeHistoryItem {
  time: string;
  action: "买入" | "卖出";
  quantity: string;
  price: string;
  pnl?: string;
}

export const MOCK_TRADE_HISTORY: TradeHistoryItem[] = [
  { time: "15:23", action: "买入", quantity: "0.010 BTC", price: "$59,500", pnl: "+$12" },
  { time: "15:00", action: "卖出", quantity: "0.008 BTC", price: "$59,200", pnl: "-$8" },
  { time: "14:30", action: "买入", quantity: "0.015 BTC", price: "$58,900" },
];

export interface DecisionSummary {
  time: string;
  signal: string;
  action: string;
  score: number;
}

export const MOCK_DECISIONS: DecisionSummary[] = [
  { time: "15:23", signal: "RSI=28", action: "买入", score: 0.72 },
  { time: "14:50", signal: "RSI=45", action: "观望", score: 0.52 },
  { time: "14:10", signal: "MACD金叉", action: "买入", score: 0.68 },
];
