import type { Metadata } from "next";
import "@mysten/dapp-kit/dist/index.css";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/AppShell";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "TradingPanda — AI Trading Companion on Sui",
  description:
    "Mint your panda NFT with on-chain personality. Teach it trading strategies and watch it grow through autonomous simulated trading on Sui.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "TradingPanda",
    description: "AI trading companion on Sui",
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
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
