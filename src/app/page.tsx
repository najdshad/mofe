import Link from "next/link";
import { Check, ChevronLeft, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const navItems = [
  { label: "چیست؟", href: "#what" },
  { label: "چگونه کار می‌کند", href: "#how" },
  { label: "مزایا", href: "#why" },
];

const benefits = [
  "به‌روزرسانی منو بدون بازطراحی",
  "نمایش آخرین نسخه برای مشتری",
  "بدون نصب اپلیکیشن",
  "مناسب کافه‌ها و رستوران‌های فارسی‌زبان",
  "مدیریت ساده برای استفاده روزانه",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[11px] uppercase tracking-[0.28em] text-ink-muted">
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1 text-[12px] text-ink-muted">
      {children}
    </span>
  );
}

export default function MofeLandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      <div className="mx-auto max-w-[1040px] px-5 sm:px-6 lg:px-8">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-line py-5">
          <a href="#top" className="text-[18px] tracking-[0.08em] text-ink font-serif">
            mofé
          </a>
          <nav className="hidden items-center gap-3 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-[14px] text-ink-muted transition hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-[14px] text-ink transition hover:bg-surface md:hidden"
          >
            ثبت‌نام
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </header>

        {/* Hero */}
        <section id="top" className="py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-ink-muted">
                <Sparkles className="h-4 w-4" />
                منوی دیجیتال ساده برای کافه‌ها و رستوران‌های فارسی‌زبان
              </div>
            </div>

            <h1 className="text-[64px] leading-[0.9] tracking-[-0.04em] md:text-[88px] font-serif">
              mofé
            </h1>

            <p className="mt-7 text-[22px] leading-10 text-ink md:text-[26px] md:leading-[1.9]">
              منوی خود را مدیریت کنید، کد QR دریافت کنید و تغییرات را در چند دقیقه منتشر کنید.
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-ink-muted md:text-[18px] md:leading-9">
              بدون اپلیکیشن، بدون پیچیدگی، فقط یک تجربه تمیز و قابل اعتماد برای شما و مشتریان شما.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg">
                  ثبت‌نام کافه
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  ورود به سیستم
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-2">
              <Pill>RTL-first</Pill>
              <Pill>بدون JS در منوی مشتری</Pill>
              <Pill>طراحی سبک و ماندگار</Pill>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section id="what" className="border-t border-line py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <SectionLabel>What mofé does</SectionLabel>
              <h2 className="text-[34px] leading-[1.15] md:text-[44px] font-serif">
                یک ابزار عملی برای ساخت، مدیریت و انتشار منوی دیجیتال.
              </h2>
              <p className="mt-6 max-w-2xl text-[18px] leading-9 text-ink-muted">
                mofé به کافه‌ها و رستوران‌ها کمک می‌کند آیتم‌های منو را اضافه کنند، قیمت و توضیحات را مدیریت کنند و نسخه به‌روز را برای مشتریان منتشر کنند. مشتری فقط QR را اسکن می‌کند و منو را روی موبایل می‌بیند.
              </p>
            </div>

            <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-[14px] text-ink-muted">قابلیت‌ها</span>
                <QrCode className="h-5 w-5 text-ink" />
              </div>
              <ul className="mt-5 space-y-4">
                {[
                  "ساخت و ویرایش آیتم‌های منو",
                  "انتشار فوری تغییرات",
                  "تولید منوی QR",
                  "تجربه موبایلی سریع و سبک",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[16px] leading-7 text-ink">
                    <Check className="mt-1 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-line py-20 md:py-28">
          <SectionLabel>How it works</SectionLabel>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                number: "01",
                title: "ساخت منو",
                text: "آیتم‌ها را اضافه کنید و دسته‌بندی منو را بسازید.",
              },
              {
                number: "02",
                title: "دریافت QR",
                text: "برای منو یک QR اختصاصی دریافت کنید.",
              },
              {
                number: "03",
                title: "انتشار برای مشتریان",
                text: "مشتری QR را اسکن می‌کند و آخرین نسخه را می‌بیند.",
              },
            ].map((step) => (
              <article key={step.number} className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 md:p-8">
                <div className="text-[12px] tracking-[0.3em] text-ink-muted">{step.number}</div>
                <h3 className="mt-6 text-[26px] leading-tight">{step.title}</h3>
                <p className="mt-4 text-[17px] leading-8 text-ink-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Why */}
        <section id="why" className="border-t border-line py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <SectionLabel>Why cafe owners use it</SectionLabel>
              <h2 className="text-[34px] leading-[1.15] md:text-[44px] font-serif">
                برای کار روزانه ساخته شده، نه برای نمایش.
              </h2>
              <p className="mt-6 text-[18px] leading-9 text-ink-muted">
                این صفحه باید اعتماد ایجاد کند: ساده، روشن و قابل استفاده برای افرادی که می‌خواهند فقط منوی خود را سریع و درست مدیریت کنند.
              </p>
            </div>

            <div className="grid gap-3">
              {benefits.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper px-5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-[16px] leading-7">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-line py-8">
          <div className="flex flex-col gap-3 text-[14px] text-ink-muted md:flex-row md:items-center md:justify-between">
            <div className="text-ink font-serif">mofé</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span>© 2026 mofé</span>
              <span>تماس: hello@mofe.ir</span>
              <span>Telegram: @mofe</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
