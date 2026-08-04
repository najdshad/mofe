import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpLeft,
  Check,
  ChevronLeft,
  FileCode2,
  Globe2,
  QrCode,
  ScanLine,
  Server,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "mofé — Product Catalogue",
  description:
    "سکوی مدیریت منوی دیجیتال و تولید QR برای کافه‌ها و رستوران‌های فارسی‌زبان.",
};

const navigation = [
  { label: "مسئله", href: "#problem" },
  { label: "محصول", href: "#product" },
  { label: "فناوری", href: "#technology" },
  { label: "مسیر رشد", href: "#roadmap" },
];

const solutionRows = [
  ["هزینه و تأخیر چاپ", "منوی دیجیتال که با یک کلیک منتشر می‌شود."],
  ["ابزارهای خارجی", "فارسی کامل، تومان، تاریخ شمسی و میزبانی داخلی."],
  ["منوی اینستاگرامی", "صفحه HTML اختصاصی با لینک دائمی و QR اختصاصی."],
  ["ظاهر یکنواخت", "رنگ و لوگوی کافه، در منوی عمومی بازتاب می‌یابد."],
  ["قیمت‌های پیچیده", "انواع و قیمت‌های مستقل برای هر آیتم، بدون ابهام."],
];

const technology = [
  ["وب", "Next.js 16، App Router و TypeScript strict"],
  ["داده", "PostgreSQL 16 و Prisma v7"],
  ["بلادرنگ", "منوی عمومی به صورت HTML ایستاده، بدون JavaScript"],
  ["رسانه", "Sharp برای WebP فشرده تا ۵۰ کیلوبایت"],
  ["استقرار", "Docker و nginx، بدون وابستگی به CDN خارجی"],
  ["امنیت", "Session http-only، CSRF و rate limit"],
];

function SectionEyebrow({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 text-[11px] tracking-[0.2em] text-ink-muted">
      <span className="font-serif text-[13px] tracking-[0.08em]">{number}</span>
      <span className="h-px w-8 bg-line" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-serif text-[34px] leading-[1.2] tracking-[-0.025em] text-ink sm:text-[42px] ${className}`}
    >
      {children}
    </h2>
  );
}

function PaperTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-muted">
      {children}
    </span>
  );
}

function MenuPublicationMockup() {
  const entries = [
    ["اسپرسو", "۹۵,۰۰۰"],
    ["لاته", "۱۲۰,۰۰۰"],
    ["موکا", "۱۳۵,۰۰۰"],
    ["آفوگاتو", "۱۴۵,۰۰۰"],
  ];

  return (
    <div className="mx-auto w-[252px] rotate-[2deg] sm:w-[270px]">
      <div className="rounded-[36px] border-[3px] border-ink bg-paper p-3 shadow-[6px_7px_0_rgba(17,17,17,0.13)]">
        <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-ink" />
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <span className="font-serif text-[16px]">کافه نقطه</span>
          <span className="text-[9px] tracking-[0.2em] text-ink-muted">MENU</span>
        </div>
        <div className="mb-4 flex gap-1 overflow-hidden">
          <span className="shrink-0 rounded-full border border-ink px-2.5 py-1 text-[9px]">
            قهوه
          </span>
          <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[9px] text-ink-muted">
            نوشیدنی سرد
          </span>
        </div>
        <div className="mb-2 border-b border-line pb-2 text-[10px] tracking-[0.18em] text-ink-muted">
          قهوه
        </div>
        <div className="space-y-2.5">
          {entries.map(([name, price]) => (
            <div
              key={name}
              className="flex items-baseline justify-between border-b border-line/55 pb-2"
            >
              <span className="text-[12px]">{name}</span>
              <span className="text-[10px] text-ink-muted">{price}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center border-t border-line pt-3">
          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.14em] text-ink-muted">
            <QrCode className="h-3 w-3" />
            mofé
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminMockup() {
  const items = [
    ["اسپرسو", "قهوه", "۹۵,۰۰۰"],
    ["لاته", "قهوه", "۱۲۰,۰۰۰"],
    ["چای سیاه", "نوشیدنی گرم", "۴۵,۰۰۰"],
    ["آفوگاتو", "دسر", "۱۴۵,۰۰۰"],
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-ink-muted">پنل مدیریت</p>
          <p className="mt-1 font-serif text-[17px]">منوی کافه نقطه</p>
        </div>
        <span className="rounded-full bg-ink px-3 py-1.5 text-[10px] text-paper">
          انتشار
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-ink px-3 py-1 text-[10px]">همه</span>
          <span className="rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted">
            قهوه
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted">
            دسر
          </span>
        </div>
        <div className="space-y-2">
          {items.map(([name, category, price]) => (
            <div
              className="flex items-center justify-between rounded-[18px] border border-line bg-surface px-3 py-2.5"
              key={name}
            >
              <div>
                <p className="text-[12px] text-ink">{name}</p>
                <p className="mt-0.5 text-[9px] text-ink-muted">{category}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-ink-muted">{price}</span>
                <span className="h-3.5 w-3.5 rounded-sm border border-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductCataloguePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="font-serif text-[21px] tracking-[0.08em]" href="/">
            mofé
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <a
                className="rounded-full px-4 py-2 text-[13px] text-ink-muted transition hover:text-ink"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
            <Link
              className="mr-3 inline-flex items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-[13px] transition hover:bg-ink hover:text-paper"
              href="/signup"
            >
              درخواست دمو
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </nav>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-[13px] md:hidden"
            href="/signup"
          >
            درخواست دمو
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section className="overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <p className="mb-7 flex items-center gap-3 text-[11px] tracking-[0.2em] text-ink-muted">
              <span className="h-px w-9 bg-ink-muted/70" />
              PRODUCT CATALOGUE · ۲۰۲۶
            </p>
            <h1 className="font-serif text-[48px] leading-[1.04] tracking-[-0.04em] sm:text-[64px] lg:text-[76px]">
              تمام جریان
              <br />
              مهمان‌نوازی،
              <br />
              در یک ابزار.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-9 text-ink-muted sm:text-[20px]">
              mofé سکوی مدیریت منوی دیجیتال و تولید QR برای کافه‌ها و رستوران‌های فارسی‌زبان است.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[14px] text-paper transition hover:opacity-90"
                href="/signup"
              >
                مشاهده پنل دمو
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-7 py-3.5 text-[14px] transition hover:border-ink"
                href="/m/noghteh"
              >
                منوی عمومی نمونه
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink-muted">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> فارسی، RTL و تومان</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> متن‌باز و خودمیزبان</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> بدون اپلیکیشن مشتری</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px]">
            <div className="absolute inset-0 rounded-[var(--radius-panel)] border border-line bg-surface" />
            <div className="relative grid min-h-[420px] grid-cols-[1fr_auto] items-end gap-4 overflow-hidden rounded-[var(--radius-panel)] p-6 sm:p-8">
              <div className="self-start">
                <p className="text-[10px] tracking-[0.2em] text-ink-muted">ONE PRODUCT · THREE SURFACES</p>
                <div className="mt-5 max-w-[180px] border-t border-ink pt-3 font-serif text-[20px] leading-7">
                  منو، QR و انتشار.
                </div>
                <div className="mt-9 space-y-2">
                  {["مدیریت منو", "انتشار عمومی", "طراحی اختصاصی"].map((label, index) => (
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted" key={label}>
                      <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-ink" : "bg-ink/30"}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <MenuPublicationMockup />
              <div className="absolute bottom-6 right-6 rounded-[18px] border border-line bg-paper px-3 py-2 text-[10px] text-ink-muted">
                اسکن کن، ببین، انتخاب کن.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line" id="problem">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.83fr_1.17fr] lg:gap-20">
            <div>
              <SectionEyebrow number="۰۱">مسئله</SectionEyebrow>
              <SectionHeading>کافه‌ها با ابزارهای ناهماهنگ اداره می‌شوند.</SectionHeading>
              <p className="mt-6 text-[16px] leading-8 text-ink-muted">
                منوی چاپی با تغییر قیمت منقضی می‌شود، اینستاگرام جای منوی حرفه‌ای را نمی‌گیرد و آیتم ناموجود یا قیمت اشتباه، هفته‌ها از چشم مشتری پنهان می‌ماند.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["چاپِ تکراری", "هر تغییر قیمت، هزینه و تأخیر تازه‌ای برای طراحی و چاپ منو ایجاد می‌کند."],
                ["اطلاع‌رسانی کند", "آیتم ناموجود یا قیمت جدید، هفته‌ها از چشم مشتری دور می‌ماند."],
                ["تجربه نامناسب", "مشتری بین پست‌ها می‌گردد، زوم می‌کند و قیمت را حدس می‌زند."],
                ["ظاهر یکنواخت", "منوی هر کافه با برند خودش دیده نمی‌شود؛ همه به یک قالب تکراری شبیه‌اند."],
              ].map(([title, text], index) => (
                <article className="rounded-[var(--radius-card)] border border-line bg-surface p-6" key={title}>
                  <p className="text-[11px] tracking-[0.18em] text-ink-muted">۰{index + 1}</p>
                  <h3 className="mt-5 font-serif text-[22px]">{title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-ink-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line" id="product">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-3xl">
            <SectionEyebrow number="۰۲">راه‌حل</SectionEyebrow>
            <SectionHeading>یک سامانه برای تمام نقطه‌های تماس.</SectionHeading>
            <p className="mt-6 text-[16px] leading-8 text-ink-muted">
              mofé جریان منو را از ساخت تا انتشار یکپارچه می‌کند؛ هر بخش برای زبان، واحد پول و شیوه کار کافه‌های مهمان‌نوازی ایران طراحی شده است.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-[var(--radius-panel)] border border-line">
            <div className="grid grid-cols-[0.75fr_1.25fr] border-b border-line bg-surface px-5 py-3 text-[11px] tracking-[0.14em] text-ink-muted sm:px-7">
              <span>مسئله</span>
              <span>راه‌حل mofé</span>
            </div>
            {solutionRows.map(([problem, solution], index) => (
              <div
                className="grid grid-cols-[0.75fr_1.25fr] gap-4 border-b border-line px-5 py-5 last:border-b-0 sm:px-7"
                key={problem}
              >
                <div className="flex gap-3 text-[13px] text-ink-muted">
                  <span className="font-serif text-ink/45">۰{index + 1}</span>
                  <span>{problem}</span>
                </div>
                <p className="text-[14px] leading-7 text-ink">{solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <SectionEyebrow number="۰۳">مدیریت منو</SectionEyebrow>
              <SectionHeading>منو مانند یک نشریه، نه یک فایل گم‌شده.</SectionHeading>
              <p className="mt-6 text-[16px] leading-8 text-ink-muted">
                ساخت، مرتب‌سازی و انتشار منو در یک محیط عملیاتی سبک انجام می‌شود. ترتیب دقیق همان چیزی است که مشتری در تلفن خود می‌بیند.
              </p>
              <ul className="mt-7 grid gap-3 text-[14px] leading-7 text-ink-muted sm:grid-cols-2">
                {[
                  "دسته‌بندی و مرتب‌سازی drag-and-drop",
                  "انواع و قیمت‌های مستقل برای هر آیتم",
                  "برچسب‌های آلرژن و وضعیت ناموجود",
                  "ورود و خروجی CSV امن",
                  "فشرده‌سازی خودکار عکس به WebP",
                  "جست‌وجو و فیلتر سریع آیتم‌ها",
                ].map((item) => (
                  <li className="flex gap-2" key={item}>
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-ink" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <AdminMockup />
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="order-last flex justify-center lg:order-first">
            <MenuPublicationMockup />
          </div>
          <div>
            <SectionEyebrow number="۰۴">منوی عمومی QR</SectionEyebrow>
            <SectionHeading>یک صفحه چاپیِ سریع، در جیب مشتری.</SectionHeading>
            <p className="mt-6 text-[16px] leading-8 text-ink-muted">
              با انتشار منو، یک snapshot مستقل ذخیره و در مسیر عمومی نمایش داده می‌شود: سبک، خوانا، امن و کامل برای گوشی‌های ضعیف.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <PaperTag>HTML ایستاده، بدون JavaScript</PaperTag>
              <PaperTag>حدود ۱۰ کیلوبایت</PaperTag>
              <PaperTag>RTL و اعداد فارسی</PaperTag>
              <PaperTag>SEO و Open Graph</PaperTag>
              <PaperTag>کش ۶۰ ثانیه</PaperTag>
            </div>
            <div className="mt-8 flex gap-3 border-t border-line pt-5 text-[13px] leading-7 text-ink-muted">
              <ScanLine className="mt-1 h-4 w-4 shrink-0 text-ink" />
              <p>
                مشتری QR را اسکن می‌کند، بدون نصب اپلیکیشن منوی به‌روز را می‌بیند و وضعیت ناموجود، عکس، آلرژن و انواع هر آیتم را در اختیار دارد.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line" id="technology">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <SectionEyebrow number="۰۵">بنیان فنی</SectionEyebrow>
              <SectionHeading>ساخته‌شده برای استقلال و دوام.</SectionHeading>
              <p className="mt-6 text-[16px] leading-8 text-ink-muted">
                معماری mofé از ابتدا با نیازهای زیرساختی ایران سازگار شده: بدون فونت، CDN یا ورود خارجی؛ با کنترل کامل داده و مسیر استقرار.
              </p>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line">
              {technology.map(([layer, detail]) => (
                <div className="grid grid-cols-[0.62fr_1.38fr] border-b border-line px-5 py-4 last:border-b-0 sm:px-7" key={layer}>
                  <span className="text-[12px] text-ink-muted">{layer}</span>
                  <span className="text-[13px] leading-6">{detail}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [Server, "خودمیزبان", "اجرای کامل با Docker؛ دیتابیس، فایل‌ها و فونت‌ها در اختیار شماست."],
              [ShieldCheck, "امنیت عملیاتی", "احراز هویت نشست‌محور، CSRF، rate limit و audit log."],
              [FileCode2, "متن‌باز", "شفافیت کامل کد، امکان بررسی، fork و سفارشی‌سازی."],
            ].map(([Icon, title, text]) => {
              const FeatureIcon = Icon as typeof Server;
              return (
                <article className="rounded-[var(--radius-card)] border border-line p-6" key={title as string}>
                  <FeatureIcon className="h-5 w-5 text-ink" />
                  <h3 className="mt-5 font-serif text-[21px]">{title as string}</h3>
                  <p className="mt-3 text-[13px] leading-7 text-ink-muted">{text as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line" id="roadmap">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <SectionEyebrow number="۰۶">وضعیت و مسیر رشد</SectionEyebrow>
              <SectionHeading>هسته محصول آماده است؛ لایه‌های مقیاس در راه‌اند.</SectionHeading>
              <p className="mt-6 text-[16px] leading-8 text-ink-muted">
                ماژول‌های اصلی منو و QR پیاده‌سازی شده‌اند و انتشار منوی عمومی از روز اول در دسترس است.
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-line">
              <div className="border-b border-line bg-surface px-6 py-4 text-[11px] tracking-[0.16em] text-ink-muted">
                NEXT
              </div>
              <ul className="divide-y divide-line">
                {[
                  "دامنه اختصاصی برای هر کافه با CNAME",
                  "تحویل سریع‌تر منو از CDN داخلی",
                  "آمار بازدید و تعامل منوی QR",
                  "خروجی چاپی برای بروشور و کارت میز",
                  "مولتی‌شعبه و منوی ترکیبی",
                  "فارسی، انگلیسی و عربی در یک منو",
                ].map((item, index) => (
                  <li className="flex items-center gap-4 px-6 py-4 text-[14px]" key={item}>
                    <span className="font-serif text-[15px] text-ink-muted">۰{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-3xl">
            <SectionEyebrow number="۰۷">برای هر مقیاس</SectionEyebrow>
            <SectionHeading>از چای‌خانه محلی تا رستوران شلوغ.</SectionHeading>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ["کافه کوچک", "یک شعبه · ۳۰ آیتم", "یک بار منو را تنظیم می‌کند، QR را روی میز می‌چسباند و هر تغییر قیمت را همان لحظه منتشر می‌کند."],
              ["رستوران شلوغ", "منوی بزرگ · عکس زیاد", "منویی سبک که با صدها آیتم در چند ثانیه منتشر می‌شود و روی هر گوشی روان کار می‌کند."],
              ["چای‌خانه سنتی", "منوی محدود · نیاز سبک", "برای یک منوی تمیز و حرفه‌ای، بدون هزینه چاپ یا پیچیدگی ابزارهای خارجی."],
            ].map(([title, meta, text], index) => (
              <article className="rounded-[var(--radius-card)] border border-line p-6" key={title}>
                <p className="text-[11px] tracking-[0.16em] text-ink-muted">USE CASE · ۰{index + 1}</p>
                <h3 className="mt-5 font-serif text-[24px]">{title}</h3>
                <p className="mt-2 text-[12px] text-ink-muted">{meta}</p>
                <p className="mt-5 text-[14px] leading-7 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 md:py-28">
          <p className="text-[11px] tracking-[0.2em] text-ink-muted">DEMO ACCESS</p>
          <h2 className="mt-5 font-serif text-[38px] leading-[1.2] tracking-[-0.025em] sm:text-[48px]">
            محصول را در کار واقعی ببینید.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-8 text-ink-muted">
            نسخه دمو با داده واقعی کافه نقطه آماده است: ۶۶ آیتم منو، پنل مدیریت کامل و منوی عمومی قابل اسکن.
          </p>
          <div className="mx-auto mt-8 grid max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-line text-right sm:grid-cols-2">
            <div className="border-b border-line p-5 sm:border-b-0 sm:border-l">
              <p className="text-[10px] tracking-[0.16em] text-ink-muted">ADMIN DEMO</p>
              <p className="mt-3 text-[14px]">admin@noghteh</p>
              <p className="mt-1 text-[13px] text-ink-muted">demo1234</p>
            </div>
            <div className="p-5">
              <p className="text-[10px] tracking-[0.16em] text-ink-muted">PUBLIC MENU</p>
              <Link className="mt-3 inline-flex items-center gap-1.5 text-[14px] underline-offset-4 hover:underline" href="/m/noghteh">
                مشاهده منوی کافه نقطه
                <ArrowUpLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-3.5 text-[14px] text-paper transition hover:opacity-90" href="/login">
              ورود به دمو
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <a className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-8 py-3.5 text-[14px] transition hover:border-ink" href="mailto:hello@mofe.ir">
              گفت‌وگو با تیم mofé
              <Globe2 className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 text-[13px] text-ink-muted sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="font-serif text-[20px] tracking-[0.08em] text-ink" href="/">
              mofé
            </Link>
            <p className="mt-2">سامانه‌ای آرام و دقیق برای مهمان‌نوازی فارسی‌زبان.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a className="hover:text-ink" href="mailto:hello@mofe.ir">hello@mofe.ir</a>
            <a className="hover:text-ink" href="https://t.me/mofe" rel="noopener noreferrer" target="_blank">@mofe در تلگرام</a>
            <a className="hover:text-ink" href="https://github.com/anomalyco/mofe-menu" rel="noopener noreferrer" target="_blank">GitHub</a>
          </div>
          <span>© ۲۰۲۶ mofé</span>
        </div>
      </footer>
    </main>
  );
}
