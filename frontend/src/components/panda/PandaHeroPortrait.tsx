"use client";

import Image from "next/image";
import { clsx } from "clsx";
import type { PandaArchetype } from "@/lib/landing/landingContent";
import { DEFAULT_HERO_PANDA_PORTRAIT, heroPandaPortraitPath } from "@/lib/landing/heroPandaPortraits";

interface PandaHeroPortraitProps {
  archetypeId?: PandaArchetype["id"];
  src?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  alt?: string;
}

export function PandaHeroPortrait({
  archetypeId,
  src,
  className,
  priority = false,
  sizes = "(max-width: 768px) 80vw, 430px",
  alt = "Trading Panda agent portrait",
}: PandaHeroPortraitProps) {
  const imageSrc = src ?? (archetypeId ? heroPandaPortraitPath(archetypeId) : DEFAULT_HERO_PANDA_PORTRAIT);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={512}
      height={512}
      priority={priority}
      sizes={sizes}
      className={clsx("h-full w-full object-contain", className)}
    />
  );
}
