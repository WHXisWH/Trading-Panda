"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchAuthMe } from "@/lib/auth.service";
import { useAuthStore } from "@/stores/authStore";

const SKIP_PREFIXES = ["/onboarding", "/auth/", "/mint"];

/**
 * Redirect authenticated users without onboarding_survey to /onboarding.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, jwt, user, setAuth } = useAuthStore();
  const token = accessToken ?? jwt;
  const checked = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (user?.onboardingSurvey) return;

    if (checked.current) return;
    checked.current = true;

    void fetchAuthMe()
      .then((me) => {
        setAuth(me, token, useAuthStore.getState().refreshToken ?? undefined);
        if (!me.onboardingSurvey) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        checked.current = false;
      });
  }, [token, pathname, user?.onboardingSurvey, router, setAuth]);

  return <>{children}</>;
}
