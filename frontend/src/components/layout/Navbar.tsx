"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { WalletButton } from "@/components/layout/WalletButton";
import { isPandaLabEnabled } from "@/lib/pandaLab";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/mint", label: "Mint" },
  { href: "/market", label: "Market" },
  { href: "/leaderboard", label: "Ranks" },
];

const JOURNEY_LINKS = [
  { href: "/mint", label: "Mint" },
  { href: "/agent-wallet", label: "Wallet" },
  { href: "/strategy", label: "Strategy", needsPanda: true },
  { href: "/training-ledger", label: "Training", needsPanda: true },
];

function needsPandaListRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/mint" ||
    pathname === "/profile" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/training-ledger") ||
    pathname.startsWith("/strategy")
  );
}

function journeyHref(base: string, pandaId: string | undefined): string {
  if (!pandaId) return base;
  if (base === "/agent-wallet") return `${base}?panda=${pandaId}`;
  if (base.startsWith("/strategy") || base.startsWith("/training-ledger")) {
    return `${base}/${pandaId}`;
  }
  return base;
}

export function Navbar() {
  const pathname = usePathname();
  const { jwt, isAuthed } = useAuth();

  const { data: pandas } = useQuery<{ id: string; name?: string }[]>({
    queryKey: ["panda", "my", jwt],
    enabled: !!jwt && needsPandaListRoute(pathname),
    queryFn: async () => {
      const res = await fetch("/api/panda/my", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const dashMatch = pathname.match(/^\/(?:dashboard|training-ledger|strategy)\/([^/]+)/);
  const currentPandaId = dashMatch?.[1] ?? pandas?.[0]?.id;

  const navClass = (href: string) =>
    clsx(
      "rounded-full border px-3 py-2 font-mono text-[11px] font-extrabold tracking-tight transition-all duration-fast",
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "border-product-green/70 bg-gradient-to-br from-product-green to-[#bfff87] text-[#071108] shadow-[var(--glow-green)]"
        : "border-white/10 bg-white/[0.045] text-[#c8c7b8] hover:-translate-y-px hover:border-product-line",
    );

  return (
    <header className="sticky top-4 z-[var(--z-navbar)] overflow-visible px-4 md:px-5">
      <div className="product-panel mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 overflow-visible !rounded-[26px] px-3 py-3 backdrop-blur-2xl">
        <Link href="/" className="flex min-w-[200px] items-center gap-3" aria-label="TradingPanda Home">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-product-gold/30 bg-gradient-to-br from-[#2b2f25] via-[#080a07] to-[#172014] shadow-[inset_0_-10px_22px_rgba(0,0,0,0.34),0_0_28px_rgba(109,255,144,0.11)]">
            <Image src="/assets/ui-logo.svg" alt="" width={28} height={28} className="h-7 w-7" priority />
          </span>
          <span>
            <strong className="block text-[15px] font-bold leading-tight tracking-tight text-product-text">
              TradingPanda
            </strong>
            <span className="mt-1 block font-mono text-[10px] text-product-muted">
              Autonomous Agent Wallet OS
            </span>
          </span>
        </Link>

        <nav className="hidden flex-wrap items-center justify-end gap-2 lg:flex" aria-label="Primary">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={navClass(href)}>
              {label}
            </Link>
          ))}
          {isAuthed && currentPandaId
            ? JOURNEY_LINKS.slice(1).map(({ href, label }) => (
                <Link key={href} href={journeyHref(href, currentPandaId)} className={navClass(href)}>
                  {label}
                </Link>
              ))
            : null}
          {isPandaLabEnabled() ? (
            <Link href="/panda-lab" className={navClass("/panda-lab")}>
              Lab
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
