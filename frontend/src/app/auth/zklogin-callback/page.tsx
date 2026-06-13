"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseIdTokenFromCallbackHash } from "@/lib/sui/zkLogin";
import { useZkLogin } from "@/hooks/useZkLogin";
import { toast } from "sonner";

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const { completeWithIdToken } = useZkLogin();
  const [message, setMessage] = useState("正在完成 Google 登录…");

  useEffect(() => {
    const hash = window.location.hash;
    const idToken = parseIdTokenFromCallbackHash(hash);
    if (!idToken) {
      setMessage("未收到 id_token，请重试 Google 登录");
      return;
    }
    completeWithIdToken(idToken)
      .then(() => {
        toast.success("登录成功");
        router.replace("/");
      })
      .catch(() => setMessage("登录失败，请返回首页重试"));
  }, [completeWithIdToken, router]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-neutral-700">{message}</p>
    </main>
  );
}
