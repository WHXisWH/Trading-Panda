"use client";

import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { User, Wallet, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user, isAuthed } = useAuth();

  if (!isAuthed) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-500">
            Connect your wallet to view your profile
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
          <p className="mt-1 text-sm text-neutral-500">Your TradingPanda account</p>
        </div>

        <Card variant="default" className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
              <Wallet className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Wallet</p>
              <p className="font-mono text-sm text-neutral-900 break-all">
                {user?.walletAddress ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Daily Check-in</p>
              <p className="text-sm text-neutral-900">Coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
