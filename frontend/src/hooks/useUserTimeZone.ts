"use client";

import { useEffect, useState } from "react";
import {
  detectBrowserTimeZone,
  getCachedUserTimeZone,
  resolveUserTimeZone,
} from "@/lib/market/formatMarketTime";

export function useUserTimeZone(): string {
  const [timeZone, setTimeZone] = useState(() => getCachedUserTimeZone());

  useEffect(() => {
    setTimeZone(detectBrowserTimeZone());
    void resolveUserTimeZone().then(setTimeZone);
  }, []);

  return timeZone;
}
