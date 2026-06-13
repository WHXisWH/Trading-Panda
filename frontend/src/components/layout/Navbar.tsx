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
  { href: "/", label: "Home" },
  { href: "/mint", label: "Mint" },
  { href: "/market", label: "Market" },
];

const LAB_NAV = { href: "/panda-lab", label: "Lab" } as const;

/** Routes that need the full panda list in the nav. */
function needsPandaListRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/mint" ||
    pathname === "/profile" ||
    pathname.startsWith("/dashboard")
  );
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

  const dashMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const currentPandaId = dashMatch?.[1];

  return (
    <header className="sticky top-0 z-[var(--z-navbar)] h-navbar shrink-0 border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex h-full max-w-page items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-lg text-neutral-900 transition-colors hover:text-primary-500"
          aria-label="TradingPanda Home"
        >
          <Image
            src="/assets/ui-logo.svg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          <span>TradingPanda</span>
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "text-neutral-500 hover:bg-primary-50 hover:text-primary-500",
              )}
            >
              {label}
            </Link>
          ))}
          {isAuthed && pandas && pandas.length > 0 && (
            <Link
              href={`/dashboard/${currentPandaId ?? pandas[0].id}`}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard")
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "text-neutral-500 hover:bg-primary-50 hover:text-primary-500",
              )}
            >
              Dashboard
            </Link>
          )}
          {isPandaLabEnabled() && (
            <Link
              href={LAB_NAV.href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === LAB_NAV.href
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "text-neutral-500 hover:bg-primary-50 hover:text-primary-500",
              )}
            >
              {LAB_NAV.label}
            </Link>
          )}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
