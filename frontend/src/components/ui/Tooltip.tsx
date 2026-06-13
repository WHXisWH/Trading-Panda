"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import { clsx } from "clsx";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

/**
 * Branded tooltip built on @radix-ui/react-tooltip — replaces the native
 * `title` attribute with a styled, accessible, keyboard-reachable tooltip.
 * Self-contained Provider so callers can drop it in anywhere.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
  className,
}: TooltipProps) {
  if (content == null || content === "") return <>{children}</>;
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            className={clsx(
              "z-[var(--z-toast)] max-w-xs rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-md animate-[fadeIn_120ms_ease-out]",
              className,
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-neutral-900" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
