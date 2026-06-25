"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function PasswordResetConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    setLoading(true);
    setError("");

    const { token } = await params;
    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setError(data.error || "خطا در بازنشانی رمز عبور");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-line bg-paper p-6">
        {done ? (
          <>
            <h1 className="font-serif text-xl text-ink">رمز عبور تغییر یافت</h1>
            <p className="mt-2 text-sm text-green-700">
              رمز عبور شما با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-xl text-ink">رمز عبور جدید</h1>
            <p className="mt-2 text-sm text-ink-muted">
              رمز عبور جدید خود را وارد کنید.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="رمز عبور جدید"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                autoFocus
              />
              <Input
                label="تکرار رمز عبور"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز عبور"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : "تغییر رمز عبور"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
