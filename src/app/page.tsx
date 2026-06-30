import Link from "next/link";
import { Check, ChevronLeft, Mail, MessageCircle, Phone, QrCode, Sparkles } from "lucide-react";
import RegistrationForm from "./_components/RegistrationForm";

const navItems = [
  { label: "چیست؟", href: "#what" },
  { label: "چگونه کار می‌کند", href: "#how" },
  { label: "مزایا", href: "#why" },
  { label: "ثبت‌نام", href: "#contact" },
];

const benefits = [
  "به‌روزرسانی منو بدون بازطراحی",
  "نمایش آخرین نسخه برای مشتری",
  "بدون نصب اپلیکیشن",
  "مناسب کافه‌ها و رستوران‌های فارسی‌زبان",
  "مدیریت ساده برای استفاده روزانه",
];

const contactMethods = [
  { icon: MessageCircle, label: "Telegram", value: "@mofe" },
  { icon: Phone, label: "WhatsApp", value: "+98 900 000 0000" },
  { icon: Mail, label: "Email", value: "hello@mofe.ir" },
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

function Button({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-[16px] px-5 py-3 text-[15px] font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper",
        secondary
          ? "border border-ink bg-paper text-ink hover:bg-[#eee7d8]"
          : "bg-ink text-paper hover:bg-ink-strong",
      ].join(" ")}
    >
      {children}
    </button>
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
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-[14px] text-ink transition hover:bg-[#eee7d8] md:hidden"
          >
            ثبت‌نام
            <ChevronLeft className="h-4 w-4" />
          </a>
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

            <p className="mt-7 text-[22px] leading-10 text-ink md:text-[26px] md:leading-[1.9] [font-family:Parastoo,serif]">
              منوی خود را مدیریت کنید، کد QR دریافت کنید و تغییرات را در چند دقیقه منتشر کنید.
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-ink-muted md:text-[18px] md:leading-9 [font-family:Parastoo,serif]">
              بدون اپلیکیشن، بدون پیچیدگی، فقط یک تجربه تمیز و قابل اعتماد برای شما و مشتریان شما.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#contact">
                <Button>
                  ثبت‌نام کافه
                </Button>
              </a>
              <Link href="/login">
                <Button secondary>
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
              <p className="mt-6 max-w-2xl text-[18px] leading-9 text-ink-muted [font-family:Parastoo,serif]">
                mofé به کافه‌ها و رستوران‌ها کمک می‌کند آیتم‌های منو را اضافه کنند، قیمت و توضیحات را مدیریت کنند و نسخه به‌روز را برای مشتریان منتشر کنند. مشتری فقط QR را اسکن می‌کند و منو را روی موبایل می‌بیند.
              </p>
            </div>

            <div className="rounded-[28px] border border-line bg-[#f7f2e9] p-6 md:p-8">
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
                    <span className="[font-family:Parastoo,serif]">{item}</span>
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
              <article key={step.number} className="rounded-[28px] border border-line bg-[#f7f2e9] p-6 md:p-8">
                <div className="text-[12px] tracking-[0.3em] text-ink-muted">{step.number}</div>
                <h3 className="mt-6 text-[26px] leading-tight [font-family:Parastoo,serif]">{step.title}</h3>
                <p className="mt-4 text-[17px] leading-8 text-ink-muted [font-family:Parastoo,serif]">{step.text}</p>
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
              <p className="mt-6 text-[18px] leading-9 text-ink-muted [font-family:Parastoo,serif]">
                این صفحه باید اعتماد ایجاد کند: ساده، روشن و قابل استفاده برای افرادی که می‌خواهند فقط منوی خود را سریع و درست مدیریت کنند.
              </p>
            </div>

            <div className="grid gap-3">
              {benefits.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[22px] border border-line bg-[#f7f2e9] px-5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-[16px] leading-7 [font-family:Parastoo,serif]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-line py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <SectionLabel>Contact / registration</SectionLabel>
              <h2 className="text-[34px] leading-[1.15] md:text-[44px] font-serif">
                حساب خود را بسازید یا اطلاعات بیشتر بگیرید.
              </h2>
              <p className="mt-6 max-w-2xl text-[18px] leading-9 text-ink-muted [font-family:Parastoo,serif]">
                فرم را تکمیل کنید تا تیم mofé با شما تماس بگیرد. همچنین می‌توانید از راه‌های تماس مستقیم استفاده کنید.
              </p>

              <div className="mt-8 space-y-3">
                {contactMethods.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-[22px] border border-line bg-[#f7f2e9] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
                        <div className="mt-1 text-[15px]">{value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-line bg-[#f7f2e9] p-6 md:p-8">
              <div className="mb-6 border-b border-line pb-4">
                <div className="text-[13px] uppercase tracking-[0.25em] text-ink-muted">فرم ثبت‌نام</div>
                <div className="mt-2 text-[22px] [font-family:Parastoo,serif]">حساب کافه خود را بسازید</div>
              </div>

              <RegistrationForm />
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
