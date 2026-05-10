"use client";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/market", label: "市场" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/achievements", label: "成就" },
];

export function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-panda-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl font-bold text-bamboo-900 transition-colors hover:text-bamboo-500"
        >
          🐼 TradingPanda
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              {label}
            </Link>
          ))}
          {account && (
            <Link
              href="/profile"
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === "/profile"
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              我的
            </Link>
          )}
        </nav>

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          <ConnectButton connectText="连接钱包" />
        </div>
      </div>
    </header>
  );
}
