"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const sanitizedEmail = email.trim();
      const sanitizedPassword = password.trim();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "خطا در ورود");
        return;
      }

      const redirect = searchParams.get("redirect") || "/venues";
      const safeRedirect = redirect.startsWith("/") ? redirect : "/venues";
      window.location.href = safeRedirect;
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-panel)] border border-line bg-panel/85 p-6 shadow-[0_14px_40px_rgba(48,31,21,0.07)] backdrop-blur-sm sm:p-8"
    >
      <div className="space-y-5">
        <Input
          label="ایمیل"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          autoComplete="username"
        />
        <Input
          label="رمز عبور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-7 w-full rounded-[var(--radius-control)]" disabled={loading}>
        {loading ? "..." : "ورود"}
      </Button>
    </form>
  );
}
