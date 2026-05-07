"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin/orders";

  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setErr("비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-lg border bg-white p-8"
      >
        <div>
          <h1 className="text-lg font-semibold">관리자 로그인</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            두울손 위탁판매 관리 시스템
          </p>
        </div>
        <div>
          <Label className="mb-1.5 block">비밀번호</Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            required
          />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "확인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}
