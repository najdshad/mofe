import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const steps = [
  { title: "منو بسازید", desc: "دسته‌ها و آیتم‌ها را با قیمت، عکس و توضیح مدیریت کنید." },
  { title: "انتشار دهید", desc: "با یک کلیک، منوی عمومی شما با آدرس اختصاصی آماده می‌شود." },
  { title: "به اشتراک بگذارید", desc: "لینک یا QR را روی میز، اینستاگرام یا هر جایی بگذارید." },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-6">
      <nav className="mx-auto flex w-full max-w-4xl items-center justify-between py-5">
        <span className="font-serif text-2xl text-ink-strong">mofé</span>
        <Link
          href="/login"
          className="rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          ورود
        </Link>
      </nav>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-16 text-center">
        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-ink-strong sm:text-5xl">
          منوی دیجیتال کافه‌تان، با یک کلیک
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-ink-muted">
          منوی کافه یا رستوران خود را بسازید و همین‌جا منتشر کنید؛ فارسی، سریع و بدون وابستگی به ابزار خارجی.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm text-paper transition-opacity hover:opacity-90"
          >
            ساخت منوی کافه
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-line bg-paper px-6 py-3 text-sm text-ink transition-colors hover:border-ink"
          >
            ورود به حساب
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 text-right"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
                <Check className="h-4 w-4" strokeWidth={2} />
              </div>
              <h2 className="font-serif text-lg text-ink">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}