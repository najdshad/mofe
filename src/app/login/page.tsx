import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl text-ink-strong">mofé</h1>
          <p className="mt-2 text-sm text-ink-muted">ورود به سیستم مدیریت</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-ink-muted">در حال بارگذاری...</div>}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-xs text-ink-muted">
          ایمیل: admin@nahal-cafe.ir / رمز: demo1234
        </p>
      </div>
    </div>
  );
}
