import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Image as ImageIcon,
  Languages,
  Palette,
  QrCode,
  ScanLine,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    number: "۰۱",
    title: "منو را بچینید",
    description: "دسته‌ها، آیتم‌ها، قیمت و عکس‌ها را در یک محیط ساده و فارسی وارد کنید.",
  },
  {
    number: "۰۲",
    title: "با سلیقه‌تان هماهنگ کنید",
    description: "رنگ برند، لوگو و پیام خوش‌آمد را اضافه کنید تا منو واقعاً مال شما باشد.",
  },
  {
    number: "۰۳",
    title: "لینک را روی میز بگذارید",
    description: "منو را منتشر کنید و لینک یا کد QR آن را با مشتری‌ها به اشتراک بگذارید.",
  },
];

const features = [
  {
    icon: Languages,
    title: "فارسی، از همان ابتدا",
    description: "چیدمان راست‌به‌چپ، تایپوگرافی فارسی و تجربه‌ای طبیعی برای مشتری شما.",
  },
  {
    icon: ImageIcon,
    title: "عکس‌های سبک و سریع",
    description: "عکس هر آیتم بهینه می‌شود تا منو حتی با اینترنت ضعیف هم سریع باز شود.",
  },
  {
    icon: Palette,
    title: "هماهنگ با هویت کافه",
    description: "رنگ، لوگو و متن معرفی را تغییر دهید و منویی متناسب با فضای خودتان بسازید.",
  },
  {
    icon: QrCode,
    title: "QR آماده‌ی چاپ",
    description: "کد منو را دانلود کنید و روی میز، بسته‌بندی یا ویترین قرار دهید.",
  },
];

function MenuPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-label="پیش‌نمایش منوی دیجیتال کافه">
      <div className="absolute -left-6 top-20 hidden -rotate-6 rounded-2xl border border-ink/10 bg-[#fffaf0] px-4 py-3 shadow-[0_18px_45px_rgba(48,31,21,0.12)] sm:block">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <CircleCheck className="h-4 w-4 text-success" />
          منتشر شد
        </div>
        <p className="mt-1 font-serif text-lg font-bold">mofe.ir/noghteh</p>
      </div>

      <div className="absolute -right-5 bottom-24 z-20 hidden rotate-6 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-[0_18px_45px_rgba(48,31,21,0.2)] sm:flex">
        <ScanLine className="h-8 w-8" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] text-paper/60">اسکن کن و ببین</p>
          <p className="text-sm font-bold">منوی کافه نقطه</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2.4rem] border border-ink/15 bg-[#faf5ea] p-3 shadow-[0_30px_80px_rgba(48,31,21,0.18)] sm:p-4">
        <div className="overflow-hidden rounded-[1.9rem] border border-ink/80 bg-[#f7f0e2]">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15">
              <span className="h-1 w-1 rounded-full bg-ink shadow-[6px_0_0_#111,-6px_0_0_#111]" />
            </div>
            <div className="text-center">
              <p className="font-serif text-2xl font-bold leading-none">Noghteh</p>
              <p className="mt-1 text-[9px] tracking-[0.28em] text-ink-muted">COFFEE &amp; PASTRY</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b75032] text-sm font-bold text-white">ن</div>
          </div>

          <div className="px-5 pb-6 pt-5 sm:px-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[#b75032]">خوش آمدید</p>
                <h2 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">یک مکثِ خوش‌طعم</h2>
              </div>
              <Clock3 className="mb-1 h-5 w-5 shrink-0 text-ink-muted" />
            </div>

            <div className="mt-5 flex gap-2 overflow-hidden text-xs">
              <span className="shrink-0 rounded-full bg-ink px-4 py-2 text-paper">قهوه گرم</span>
              <span className="shrink-0 rounded-full border border-ink/15 px-4 py-2">قهوه سرد</span>
              <span className="shrink-0 rounded-full border border-ink/15 px-4 py-2">کیک و شیرینی</span>
            </div>

            <div className="mt-7 flex items-center justify-between border-b border-ink/15 pb-3">
              <span className="text-xs text-ink-muted">۴ انتخاب</span>
              <h3 className="font-serif text-xl font-bold">قهوه‌های گرم</h3>
            </div>

            <div className="divide-y divide-ink/10">
              <div className="flex items-center gap-4 py-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#d9a078]">
                  <div className="relative h-11 w-12 rounded-b-[1.2rem] rounded-t-md bg-[#fff8e9] shadow-[inset_0_-8px_0_#7c4931]">
                    <span className="absolute -right-3 top-2 h-6 w-4 rounded-r-full border-[3px] border-[#fff8e9] border-l-0" />
                    <span className="absolute left-1/2 top-1 h-2 w-7 -translate-x-1/2 rounded-full bg-[#eadbc4]" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">لاته کارامل</p>
                      <p className="font-serif text-xs italic text-ink-muted">Caramel latte</p>
                    </div>
                    <p className="shrink-0 font-bold">۱۴۵٬۰۰۰</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-ink-muted">اسپرسو، شیر و کارامل دست‌ساز</p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-bold">آمریکانو</p>
                  <p className="font-serif text-xs italic text-ink-muted">Americano</p>
                  <p className="mt-2 text-[11px] leading-5 text-ink-muted">دبل اسپرسو و آب داغ</p>
                </div>
                <p className="shrink-0 font-bold">۹۸٬۰۰۰</p>
              </div>

              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">موکا فندق</p>
                    <span className="rounded-full bg-[#ead9c0] px-2 py-0.5 text-[9px]">محبوب</span>
                  </div>
                  <p className="font-serif text-xs italic text-ink-muted">Hazelnut mocha</p>
                </div>
                <p className="shrink-0 font-bold">۱۶۵٬۰۰۰</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-paper">
      <section className="relative min-h-screen border-b border-ink/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(185,79,44,0.13),transparent_25%),radial-gradient(circle_at_86%_76%,rgba(40,116,81,0.1),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#111_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

        <nav className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10" aria-label="ناوبری اصلی">
          <Link href="/" className="flex items-baseline gap-2" aria-label="موفه، صفحه اصلی">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink-strong">mofé</span>
            <span className="hidden text-[10px] text-ink-muted sm:inline">منوی دیجیتال</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
            <a href="#how" className="transition-colors hover:text-ink">چطور کار می‌کند؟</a>
            <a href="#features" className="transition-colors hover:text-ink">امکانات</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="px-3 py-2 text-sm transition-colors hover:text-accent sm:px-4">ورود</Link>
            <Link href="/signup" className="rounded-full bg-ink px-4 py-2.5 text-sm text-paper transition-transform hover:-translate-y-0.5 sm:px-5">ساخت منو</Link>
          </div>
        </nav>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:px-10 lg:pb-24 lg:pt-16">
          <div className="relative z-10 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft/70 px-3.5 py-2 text-xs text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              ساخته‌شده برای کافه‌ها و رستوران‌های ایرانی
            </div>

            <h1 className="mx-auto mt-7 max-w-2xl text-[clamp(3rem,8vw,6.8rem)] font-bold leading-[0.96] tracking-[-0.045em] text-ink-strong lg:mx-0">
              منویی که
              <span className="relative mx-2 inline-block font-serif font-medium italic text-accent sm:mx-3">
                اشتها
                <svg className="absolute -bottom-2 left-0 h-3 w-full text-accent/45" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 9C63 1 167 1 238 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              می‌سازد.
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-ink-muted sm:text-lg sm:leading-9 lg:mx-0">
              منوی دیجیتال زیبای خودتان را در چند دقیقه بسازید، با یک کلیک به‌روز کنید و با یک اسکن به دست مشتری برسانید.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-accent px-7 text-base font-bold text-white shadow-[0_12px_30px_rgba(185,79,44,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#a94325] sm:w-auto">
                رایگان شروع کنید
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Link>
              <a href="#showcase" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/25 px-7 text-sm transition-colors hover:border-ink/40 hover:bg-white/50 sm:w-auto">
                دیدن نمونه منو
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-muted lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> بدون نیاز به کارت بانکی</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> راه‌اندازی در چند دقیقه</span>
            </div>
          </div>

          <div id="showcase" className="relative scroll-mt-20 lg:pr-10">
            <MenuPreview />
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-16 bg-ink px-5 py-24 text-paper sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-b border-paper/15 pb-12 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs tracking-[0.18em] text-[#d68a6e]">ساده، سریع، همیشه تازه</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">از اولین آیتم تا اولین اسکن؛ فقط سه قدم.</h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-paper/55 lg:justify-self-end">وقت شما باید صرف قهوه‌ی بهتر و تجربه‌ی بهتر شود، نه درگیری با ابزارهای پیچیده. موفه مسیر ساخت و انتشار منو را کوتاه کرده است.</p>
          </div>

          <div className="grid gap-px bg-paper/15 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="group bg-ink py-10 sm:p-10 lg:min-h-80 lg:px-8 lg:py-12">
                <span className="font-serif text-5xl italic text-[#d68a6e]">{step.number}</span>
                <h3 className="mt-16 text-2xl font-bold sm:mt-20">{step.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-paper/55">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs tracking-[0.18em] text-accent">جزئیاتی که فرق می‌سازند</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">همه‌چیز برای یک منوی خوب؛ نه بیشتر، نه کمتر.</h2>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className={`group rounded-[2rem] border border-ink/10 p-7 transition-colors hover:border-ink/25 sm:p-9 ${index === 0 ? "bg-accent-soft/55" : index === 3 ? "bg-[#dce8df]" : "bg-white/25"}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-paper">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </div>
                  <span className="font-serif text-4xl italic text-ink/15">0{index + 1}</span>
                </div>
                <h3 className="mt-12 text-2xl font-bold">{title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-ink-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-5 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10">
        <div className="relative mx-auto overflow-hidden rounded-[2.5rem] bg-accent px-6 py-20 text-center text-white sm:px-12 sm:py-24">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border-[60px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full border-[70px] border-ink/10" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-sm text-white/70">منوی تازه، همین امروز</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">میزهای کافه‌تان آماده‌اند؟</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">منوی دیجیتال خودتان را بسازید و اولین QR را روی میز بگذارید.</p>
            <Link href="/signup" className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-ink px-8 font-bold text-paper transition-transform hover:-translate-y-0.5">
              ساخت منوی من
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold">mofé</span>
            <span className="text-xs text-ink-muted">منوی خوب، حال خوب.</span>
          </div>
          <p className="text-xs text-ink-muted">ساخته‌شده برای کافه‌های مستقل ایران</p>
        </div>
      </footer>
    </main>
  );
}
