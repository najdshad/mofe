import Link from "next/link";
import {
  Check, ChevronLeft, FileText, Zap, ClipboardList,
  Smartphone, QrCode, Star, ArrowUpLeft,
} from "lucide-react";

const navItems = [
  { label: "قابلیت‌ها", href: "#features" },
  { label: "چگونه کار می‌کند", href: "#how" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[11px] uppercase tracking-[0.28em] text-ink-muted font-serif">
      {children}
    </div>
  );
}

function PhoneMockup() {
  const categories = ["قهوه", "نوشیدنی سرد", "دسر"];
  const items = [
    { name: "اسپرسو", price: "۹۵,۰۰۰" },
    { name: "لاته", price: "۱۲۰,۰۰۰" },
    { name: "موکا", price: "۱۳۵,۰۰۰" },
    { name: "آفوگاتو", price: "۱۴۵,۰۰۰" },
  ];
  return (
    <div className="mx-auto w-[252px] sm:w-[272px]">
      <div className="rounded-[38px] border-[3px] border-ink bg-paper p-3 shadow-[8px_10px_0_rgba(17,17,17,0.14)]">
        <div className="mb-3 flex justify-center">
          <div className="h-5 w-24 rounded-full bg-ink" />
        </div>
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <span className="font-serif text-[15px] text-ink">کافه نقطه</span>
          <span className="text-[9px] tracking-[0.18em] text-ink-muted">MENU</span>
        </div>
        <div className="mb-4 flex gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <span
              key={cat}
              className="shrink-0 rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted first:border-ink first:text-ink"
            >
              {cat}
            </span>
          ))}
        </div>
        <div className="mb-3 border-b border-line pb-2">
          <span className="text-[9px] tracking-[0.2em] text-ink-muted">قهوه</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.name} className="flex items-baseline justify-between border-b border-line/50 pb-2">
              <span className="text-[12px] text-ink">{item.name}</span>
              <span className="text-[10px] text-ink-muted tracking-wide">
                {item.price}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-line px-4 py-1.5">
            <QrCode className="h-3 w-3 text-ink-muted" />
            <span className="text-[9px] tracking-[0.15em] text-ink-muted">mofé</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanelMockup() {
  const items = [
    { name: "اسپرسو", price: "۹۵,۰۰۰", cat: "قهوه" },
    { name: "لاته", price: "۱۲۰,۰۰۰", cat: "قهوه" },
    { name: "موکا", price: "۱۳۵,۰۰۰", cat: "قهوه" },
    { name: "چای سیاه", price: "۴۵,۰۰۰", cat: "نوشیدنی گرم" },
    { name: "آفوگاتو", price: "۱۴۵,۰۰۰", cat: "دسر" },
  ];
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
        <div>
          <span className="block text-[10px] tracking-[0.18em] text-ink-muted">پنل مدیریت</span>
          <span className="mt-1 block font-serif text-[17px] text-ink">منوی کافه نقطه</span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
          <span className="text-[10px] text-ink-muted">ن</span>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <span className="rounded-full border border-ink px-3 py-1 text-[10px] text-ink">همه</span>
            <span className="rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted">قهوه</span>
            <span className="rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted">نوشیدنی</span>
          </div>
          <span className="rounded-full bg-ink px-3 py-1 text-[10px] text-paper">انتشار</span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-[18px] border border-line/60 bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper">
                  <span className="text-[10px] text-ink-muted">{item.cat.slice(0, 2)}</span>
                </div>
                <span className="text-[13px] text-ink">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-ink-muted">{item.price}</span>
                <div className="h-4 w-4 rounded-sm border border-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QRMenuMockup() {
  const sections = [
    { title: "قهوه", items: ["اسپرسو", "لاته", "کاپوچینو"] },
    { title: "دسر", items: ["بستنی", "کیک", "آفوگاتو"] },
  ];
  return (
    <div className="mx-auto w-[240px] sm:w-[260px]">
      <div className="rounded-[32px] border-[3px] border-ink bg-paper p-3">
        <div className="mb-2 flex justify-center">
          <div className="h-4 w-16 rounded-full bg-ink/10" />
        </div>
        <div className="mb-3 flex justify-center border-b border-line pb-3">
          <span className="font-serif text-[15px] text-ink">کافه نقطه</span>
        </div>
        {sections.map((sec) => (
          <div key={sec.title} className="mb-3">
            <div className="mb-1 border-b border-line/50 pb-1">
              <span className="text-[9px] tracking-[0.2em] text-ink-muted">{sec.title}</span>
            </div>
            {sec.items.map((item) => (
              <div key={item} className="flex items-baseline justify-between py-1">
                <span className="text-[11px] text-ink">{item}</span>
                <span className="text-[9px] text-ink-muted">---</span>
              </div>
            ))}
          </div>
        ))}
        <div className="flex justify-center border-t border-line pt-2">
          <QrCode className="h-4 w-4 text-ink-muted" />
        </div>
      </div>
    </div>
  );
}

export default function MofeLandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      {/* ─── Navigation ─── */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-[20px] tracking-[0.08em] text-ink font-serif">
            mofé
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-[13px] text-ink-muted transition hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            <div className="mr-3 flex overflow-hidden rounded-full border border-ink">
              <Link
                href="/login"
                className="px-4 py-2 text-[13px] text-ink transition hover:bg-ink/5"
              >
                ورود
              </Link>
              <div className="w-px self-stretch bg-ink/20" />
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] text-ink transition hover:bg-ink/5"
              >
                شروع کنید
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          </nav>
          <div className="flex items-center gap-1.5 overflow-hidden rounded-full border border-ink md:hidden">
            <Link
              href="/login"
              className="px-3 py-2 text-[13px] text-ink transition hover:bg-ink/5"
            >
              ورود
            </Link>
            <div className="w-px self-stretch bg-ink/20" />
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] text-ink transition hover:bg-ink/5"
            >
              شروع کنید
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-14 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
            <div>
              <div className="mb-7 flex items-center gap-3 text-[11px] tracking-[0.18em] text-ink-muted">
                <span className="h-px w-8 bg-ink-muted/60" />
                منوی دیجیتال برای مهمان‌نوازی خوب
              </div>
              <h1 className="text-[46px] leading-[1.02] tracking-[-0.03em] sm:text-[58px] md:text-[70px] lg:text-[78px] font-serif">
                منوی کافه‌ات،
                <br />
                همیشه روی موبایل
                <br />
                مشتری‌هایت
              </h1>
              <p className="mt-6 text-[18px] leading-9 text-ink-muted sm:text-[20px] sm:leading-[1.9] lg:text-[22px]">
                یک بار منو را درست کن. کد QR بچسبان روی میز. هر تغییری دادنی، بلافاصله برای همه نمایش داده می‌شود. بدون اپلیکیشن، بدون هزینه چاپ، بدون سردرگمی.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] text-paper transition hover:opacity-90">
                  شروع رایگان
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <Link href="/m/noghteh" className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-7 py-3.5 text-[15px] text-ink transition hover:border-ink">
                  مشاهده منوی نمونه
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  مناسب کافه‌ها، رستوران‌ها، فست‌فودها و چای‌خانه‌ها
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  بدون نیاز به کارت بانکی بین‌المللی
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  فارسی کامل — از فونت تا تاریخ و واحد پول
                </span>
              </div>
            </div>
            <div className="order-first lg:order-last">
              <div className="mx-auto max-w-[535px]">
                <PhoneMockup />
                <div className="mt-4 text-center text-[11px] text-ink-muted">
                  اسکن کن، ببین، انتخاب کن.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pain Point ─── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-4xl">
            <SectionLabel>چرا mofé</SectionLabel>
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 md:p-8">
                <div className="mb-4 text-[11px] tracking-[0.2em] text-ink-muted">قبل از mofé</div>
                <ul className="space-y-4 text-[15px] leading-8 text-ink-muted">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/20" />
                    منو چاپ می‌کنی — قیمت‌ها عوض می‌شود — منو باطل شده
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/20" />
                    مشتری سردرگم است یا باید دوباره چاپ کنی
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/20" />
                    منو در اینستاگرام — مشتری باید ورق بزند، زوم کند
                  </li>
                </ul>
              </div>
              <div className="flex justify-center text-2xl text-ink-muted md:block">←</div>
              <div className="rounded-[var(--radius-panel)] border border-ink bg-paper p-6 md:p-8">
                <div className="mb-4 text-[11px] tracking-[0.2em] text-ink-muted">بعد از mofé</div>
                <p className="text-[22px] leading-[1.6] font-serif text-ink">
                  یک بار تنظیم می‌کنی.
                  <br />
                  تا همیشه.
                </p>
                <div className="mt-6 flex gap-2">
                  <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">بدون چاپ</span>
                  <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">بدون سردرگمی</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-4xl">
            <SectionLabel>چطور کار می‌کند</SectionLabel>
            <h2 className="text-[32px] leading-[1.15] md:text-[42px] font-serif">
              در سه قدم
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "۰۱",
                title: "منوی خود را بسازید",
                text: "آیتم‌ها را اضافه کنید، دسته‌بندی کنید، قیمت بگذارید. عکس آپلود کنید. همه چیز در یک پنل ساده و سریع.",
              },
              {
                number: "۰۲",
                title: "QR اختصاصی خود را دریافت کنید",
                text: "یک کلیک. منوی شما به صورت یک صفحه HTML ایستاده و فوق‌العاده سبک منتشر می‌شود. لینک و کد QR مخصوص خود را دارید.",
              },
              {
                number: "۰۳",
                title: "روی میز بچسبانید و تمام",
                text: "مشتری اسکن می‌کند و منو را با تمام جزئیات می‌بیند — قیمت، کالری، مواد حساسیت‌زا، عکس. بدون نصب، بدون منتظر ماندن.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 transition hover:border-ink/30 md:p-8"
              >
                <div className="text-[11px] tracking-[0.3em] text-ink-muted">{step.number}</div>
                <h3 className="mt-5 text-[22px] leading-tight font-serif">{step.title}</h3>
                <p className="mt-4 text-[15px] leading-8 text-ink-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-4xl">
            <SectionLabel>چرا mofé فرق می‌کند</SectionLabel>
            <h2 className="text-[32px] leading-[1.15] md:text-[42px] font-serif">
              ساخته شده برای کار واقعی
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              {
                icon: FileText,
                title: "منوی عمومی بدون JavaScript",
                text: "صفحه‌ای که مشتری می‌بیند صرفاً HTML ایستاده است. حدود ۱۰ کیلوبایت. روی 3G در یک ثانیه لود می‌شود. بدون ردپا، بدون تبلیغ، بدون منتظر ماندن.",
              },
              {
                icon: Zap,
                title: "آپدیت آنی",
                text: "قیمت شکر را در پنل تغییر بده. یک دقیقه بعد، هر کس QR را اسکن کند قیمت جدید را می‌بیند. بدون چاپ، بدون استوری اینستاگرام.",
              },
              {
                icon: ClipboardList,
                title: "قیمت‌گذاری کامل",
                text: "برای هر آیتم چند قیمت بگذار (سایزها، افزودنی‌ها)، واریانت تعریف کن، مواد حساسیت‌زا را مشخص کن و وضعیت ناموجود را در یک لمس تغییر بده.",
              },
              {
                icon: FileText,
                title: "ورود و خروج CSV",
                text: "منویت را با اکسل یا Google Sheets بساز و یک‌جا وارد کن. خروجی CSV هم برای بایگانی و چاپ در دسترس است.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 transition hover:border-ink/30 md:p-8"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper">
                    <Icon className="h-4 w-4 text-ink" />
                  </div>
                  <h3 className="text-[18px] leading-tight font-serif text-ink">{feature.title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-ink-muted">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Menu Preview ─── */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid items-start gap-12 md:grid-cols-[1fr_0.8fr]">
            <div>
              <SectionLabel>چیزی که مشتری می‌بیند</SectionLabel>
              <h2 className="text-[28px] leading-[1.15] md:text-[36px] font-serif">
                یک منوی سیاه و سفید با خطوط ظریف و طراحی گرم
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-ink-muted">
                دقیقاً مثل یک منوی کاغذی خوب — اما همیشه به‌روز، همیشه در جیب مشتری.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">
                  فونت فارسی اختصاصی
                </span>
                <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">
                  بدون CDN خارجی
                </span>
                <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">
                  تحریم‌ناپذیر
                </span>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <QRMenuMockup />
            </div>
          </div>
          <div className="mt-16">
            <p className="mb-6 text-[11px] tracking-[0.2em] text-ink-muted">
              از چپ: پنل مدیریت — خروجی منوی QR
            </p>
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
              <AdminPanelMockup />
              <div className="flex items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-line bg-paper p-6">
                <div className="text-center">
                  <Smartphone className="mx-auto h-8 w-8 text-ink-muted/50" />
                  <p className="mt-3 text-[13px] text-ink-muted">
                    مشتری با اسکن QR
                    <br />
                    همین صفحه را می‌بیند
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>صاحبان کافه درباره mofé چه می‌گویند</SectionLabel>
            <p className="mt-6 text-[15px] leading-8 text-ink-muted">
              این بخش با اولین کاربران واقعی پر می‌شود
            </p>
            <div className="mt-8 inline-flex flex-col items-center rounded-[var(--radius-panel)] border border-line bg-paper px-8 py-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper">
                <Star className="h-5 w-5 text-ink-muted" />
              </div>
              <p className="text-[14px] leading-7 text-ink-muted">
                کافه نقطه — یک کافه دمو با ۶۶ آیتم منوی متنوع.
              </p>
              <Link
                href="/m/noghteh"
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink underline-offset-4 hover:underline"
              >
                ببینید منوی mofé چطور کار می‌کند
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[32px] leading-[1.15] md:text-[42px] font-serif">
              آماده‌ای منوی کافه‌ات را دیجیتال کنی؟
            </h2>
            <p className="mt-5 text-[17px] leading-8 text-ink-muted">
              رایگان شروع کن. بدون نیاز به کارت بانکی. یک کلیک تا اولین QR.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-10 py-4 text-[16px] text-paper transition hover:opacity-90"
              >
                شروع کنید
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-6 text-[13px] text-ink-muted">
              هنوز سوال داری؟{' '}
              <a href="https://t.me/mofe" className="underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                به ما در تلگرام پیام بده @mofe
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer>
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/" className="text-[18px] tracking-[0.08em] text-ink font-serif">
                mofé
              </Link>
              <p className="mt-3 max-w-xs text-[13px] leading-7 text-ink-muted">
                منوی دیجیتال ساده برای کافه‌ها و رستوران‌های فارسی‌زبان
              </p>
            </div>
            <div className="flex flex-col gap-2 text-[13px] text-ink-muted">
              <span>hello@mofe.ir</span>
              <a href="https://t.me/mofe" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                Telegram: @mofe
              </a>
              <a href="https://github.com/anomalyco/mofe-menu" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                GitHub
              </a>
            </div>
            <div className="text-[13px] text-ink-muted">
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} className="underline-offset-4 hover:underline hover:text-ink">
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
          <div className="mt-8 border-t border-line pt-6 text-center text-[12px] text-ink-muted">
            © ۲۰۲۶ mofé
          </div>
        </div>
      </footer>
    </div>
  );
}
