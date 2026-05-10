import type { Metadata } from "next";
import "@mysten/dapp-kit/dist/index.css";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "TradingPanda — 养一只会交易的 AI 熊猫",
  description:
    "Sui 链上 AI 交易宠物养成系统。铸造熊猫 NFT，喂给它交易策略，让它在模拟盘自主成长。",
  openGraph: {
    title: "TradingPanda",
    description: "养一只会交易的 AI 熊猫",
    siteName: "TradingPanda",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
