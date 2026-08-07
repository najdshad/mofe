"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface FieldErrors {
  name?: string;
  cafeName?: string;
  email?: string;
  password?: string;
}

export default function RegistrationForm() {
  const [name, setName] = useState("");
  const [cafeName, setCafeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "نام الزامی است";
    if (!cafeName.trim()) errs.cafeName = "نام کافه الزامی است";
    if (!email.trim()) errs.email = "ایمیل الزامی است";
    else if (!/^[^\s@]+@[^\s@]+$/.test(email)) errs.email = "ایمیل نامعتبر است";
    if (password.length < 8) errs.password = "حداقل ۸ کاراکتر";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cafeName: cafeName.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "خطا در ثبت‌نام");
        return;
      }

      window.location.href = `/admin/${data.venueId}/menu`;
    } catch {
      setServerError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {serverError && (
        <div role="alert" className="rounded-[var(--radius-control)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <Input
        label="نام"
        placeholder="مثلاً: علی رضایی"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
      />

      <Input
        label="نام کافه"
        placeholder="مثلاً: کافه روشن"
        value={cafeName}
        onChange={(e) => setCafeName(e.target.value)}
        error={fieldErrors.cafeName}
      />

      <Input
        label="ایمیل"
        placeholder="example@email.com"
        type="email"
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />

      <Input
        label="رمز عبور"
        placeholder="حداقل ۸ کاراکتر"
        type="password"
        dir="ltr"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />

      <div className="pt-2">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "در حال ایجاد حساب..." : "ثبت‌نام کافه"}
          {!loading && <ArrowLeft className="h-4 w-4 rotate-180" />}
        </Button>
      </div>
    </form>
  );
}
