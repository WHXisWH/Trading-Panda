"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  consumeZkLoginReturnTo,
  parseIdTokenFromCallbackHash,
  parseOAuthErrorFromCallbackHash,
  setZkLoginDeferredResult,
} from "@/lib/sui/zkLogin";
import { useZkLogin } from "@/hooks/useZkLogin";
import { authErrorMessage } from "@/lib/auth.service";
import { useAuthStore } from "@/stores/authStore";

type CallbackPhase = "loading" | "success" | "error";

const REDIRECT_DELAY_MS = 700;

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const { completeWithIdToken } = useZkLogin();
  const [phase, setPhase] = useState<CallbackPhase>("loading");
  const [detail, setDetail] = useState("Verifying your Google account…");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const returnTo = consumeZkLoginReturnTo();

    function finishError(message: string) {
      setPhase("error");
      setDetail(message);
      setZkLoginDeferredResult({ kind: "error", message });
      window.setTimeout(() => router.replace(returnTo), REDIRECT_DELAY_MS);
    }

    const hash = window.location.hash;
    const oauthError = parseOAuthErrorFromCallbackHash(hash);
    if (oauthError) {
      finishError(oauthError);
      return;
    }

    const idToken = parseIdTokenFromCallbackHash(hash);
    if (!idToken) {
      finishError("Google did not return a sign-in token. Please try again.");
      return;
    }

    setDetail("Fetching zkLogin proof and creating your session…");

    void completeWithIdToken(idToken)
      .then(() => {
        const { accessToken, authMethod } = useAuthStore.getState();
        if (!accessToken || authMethod !== "zklogin") {
          finishError("Google sign-in did not complete. Please try again.");
          return;
        }

        setPhase("success");
        setDetail("Redirecting you back…");
        setZkLoginDeferredResult({
          kind: "success",
          message: "Signed in with Google",
        });
        window.setTimeout(() => router.replace(returnTo), REDIRECT_DELAY_MS);
      })
      .catch((err: unknown) => {
        finishError(authErrorMessage(err));
      });
  }, [completeWithIdToken, router]);

  return (
    <main className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-dark-panel shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/ui-logo.png"
              alt="TradingPanda"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <div>
              <p className="text-sm font-semibold text-white">TradingPanda</p>
              <p className="text-xs text-white/50">Google sign-in</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          {phase === "loading" && (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary-300" />
            </span>
          )}
          {phase === "success" && (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </span>
          )}
          {phase === "error" && (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/30">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </span>
          )}

          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-white">
              {phase === "loading" && "Completing sign-in"}
              {phase === "success" && "Sign-in complete"}
              {phase === "error" && "Sign-in failed"}
            </h1>
            <p className="text-sm leading-relaxed text-white/60">{detail}</p>
          </div>

          {phase === "loading" && (
            <ol className="w-full space-y-2 text-left text-xs text-white/45">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                Google account verified
              </li>
              <li className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary-300" />
                Generating zkLogin proof for on-chain signing
              </li>
              <li className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary-300" />
                Creating your TradingPanda session
              </li>
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
