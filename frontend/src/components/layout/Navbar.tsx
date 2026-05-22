"use client";

import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { PandaSelector } from "@/components/panda/PandaSelector";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/mint", label: "铸造" },
  { href: "/market", label: "市场" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/achievements", label: "成就" },
];

export function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { jwt } = useAuth();

  const { data: pandas } = useQuery<{ id: string; name?: string }[]>({
    queryKey: ["pandas", jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch("/api/pandas", { headers: { Authorization: `Bearer ${jwt}` } }).then(
        (r) => r.json()
      ),
  });

  const dashMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const currentPandaId = dashMatch?.[1];

  return (
    <header className="sticky top-0 z-50 h-navbar border-b border-[var(--color-border)] bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="shrink-0 font-serif text-lg font-bold text-bamboo-900 transition-colors hover:text-bamboo-500"
        >
          🐼 TradingPanda
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname === href
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card hover:text-ink-900"
              )}
            >
              {label}
            </Link>
          ))}
          {account && pandas && pandas.length > 0 && (
            <Link
              href={`/dashboard/${pandas[0].id}`}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname.startsWith("/dashboard")
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card"
              )}
            >
              模拟盘
            </Link>
          )}
          {account && (
            <Link
              href="/profile"
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname === "/profile"
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card"
              )}
            >
              我的
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {currentPandaId && pandas && pandas.length > 1 && (
            <PandaSelector pandas={pandas} currentId={currentPandaId} className="hidden lg:flex" />
          )}
          <ConnectButton connectText="连接钱包" />
        </div>
      </div>
    </header>
  );
}
