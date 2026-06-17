"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
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
      router.push(safeRedirect);
      router.refresh();
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-panel)] border border-line bg-paper p-6"
    >
      <div className="space-y-4">
        <Input
          label="نام کاربری"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="username@venue"
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <Button type="submit" className="mt-6 w-full" disabled={loading}>
        {loading ? "..." : "ورود"}
      </Button>
    </form>
  );
}
