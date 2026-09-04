import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Check, QrCode, Sparkles } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(185,79,44,0.14),transparent_25%),radial-gradient(circle_at_92%_88%,rgba(40,116,81,0.1),transparent_23%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#111_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-baseline gap-2" aria-label="موفه، صفحه اصلی">
          <span className="font-serif text-3xl font-bold tracking-tight text-ink-strong">mofé</span>
          <span className="hidden text-[10px] text-ink-muted sm:inline">منوی دیجیتال</span>
        </Link>
        <Link href="/" className="group inline-flex items-center gap-2 text-xs text-ink-muted transition-colors hover:text-ink">
          بازگشت به صفحه اصلی
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-12 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:grid-cols-[1fr_0.92fr] lg:gap-14 lg:px-10 lg:pt-16">
        <section className="order-2 overflow-hidden rounded-[2rem] bg-ink p-7 text-paper shadow-[0_24px_70px_rgba(48,31,21,0.14)] sm:p-10 lg:order-1 lg:min-h-[31rem] lg:p-12" aria-label="معرفی موفه">
          <div className="relative flex h-full flex-col justify-between">
            <div className="pointer-events-none absolute -left-28 -top-32 h-80 w-80 rounded-full border-[56px] border-accent/35" />
            <div className="pointer-events-none absolute -bottom-40 -right-28 h-96 w-96 rounded-full border-[72px] border-paper/10" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-3.5 py-2 text-xs text-paper/75">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b199]" />
                مدیریت ساده، منوی همیشه تازه
              </div>
              <h1 className="mt-8 max-w-lg text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
                کافه‌تان را از همین‌جا
                <span className="mr-2 font-serif font-medium italic text-[#f5b199]"> بهتر </span>
                مدیریت کنید.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-8 text-paper/60 sm:text-base">
                منو، ظاهر برند و فروش روزانه‌تان را در یک فضای آرام و یکپارچه کنترل کنید.
              </p>
            </div>

            <div className="relative mt-12 grid gap-3 border-t border-paper/15 pt-6 text-sm text-paper/70 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#9bd0ae]" />
                انتشار فوری تغییرات
              </div>
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[#f5b199]" />
                منوی QR برای هر میز
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mb-6 px-1 sm:mb-7">
            <p className="text-xs font-medium tracking-[0.18em] text-accent">ورود امن</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-strong sm:text-4xl">خوش برگشتی.</h2>
            <p className="mt-2 text-sm text-ink-muted">برای ادامه، اطلاعات حساب‌تان را وارد کنید.</p>
          </div>
          <Suspense fallback={<div className="rounded-[var(--radius-panel)] border border-line bg-panel/80 p-8 text-center text-sm text-ink-muted shadow-[0_14px_40px_rgba(48,31,21,0.06)]">در حال بارگذاری...</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-5 px-1 text-center text-xs leading-6 text-ink-muted/80">
            ورود شما با اتصال امن انجام می‌شود و اطلاعات‌تان نزد موفه محفوظ می‌ماند.
          </p>
        </section>
      </div>
    </main>
  );
}
