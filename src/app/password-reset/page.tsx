"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetUrl("");

    const res = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetUrl(data.resetUrl);
    } else {
      setError(data.error || "خطا در ارسال درخواست");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-line bg-paper p-6">
        <h1 className="font-serif text-xl text-ink">بازنشانی رمز عبور</h1>
        <p className="mt-2 text-sm text-ink-muted">
          ایمیل خود را وارد کنید. لینک بازنشانی برای شما ایجاد می‌شود.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="ایمیل"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {resetUrl && (
            <div className="rounded-xl border border-line bg-surface p-3 text-sm text-ink">
              <p className="mb-2 text-green-700">لینک بازنشانی ایجاد شد:</p>
              <a href={resetUrl} className="break-all text-ink underline">
                {resetUrl}
              </a>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : "ارسال"}
          </Button>
        </form>
      </div>
    </div>
  );
}
