import React from "react";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Upload,
  QrCode,
  LayoutGrid,
  SlidersHorizontal,
  BadgeCheck,
  AlertCircle,
  ArrowUpDown,
  Smartphone,
  Moon,
  Sparkles,
} from "lucide-react";

const categories = [
  { nameFa: "نوشیدنی‌های گرم", active: true, count: 12 },
  { nameFa: "قهوه", active: true, count: 18 },
  { nameFa: "دسر", active: true, count: 9 },
  { nameFa: "غذا", active: false, count: 14 },
];

const items = [
  {
    nameFa: "لاته",
    nameEn: "Latte",
    category: "قهوه",
    price: "145,000",
    station: "bar",
    visible: true,
    soldOut: false,
    calories: 140,
    description: "اسپرسو با شیر بخار داده شده و کف لطیف.",
  },
  {
    nameFa: "چای دارچین",
    nameEn: "Cinnamon Tea",
    category: "نوشیدنی‌های گرم",
    price: "85,000",
    station: "kitchen",
    visible: true,
    soldOut: true,
    calories: null,
    description: "چای سیاه با دارچین و عطر آرام.",
  },
  {
    nameFa: "کیک هویج",
    nameEn: "Carrot Cake",
    category: "دسر",
    price: "175,000",
    station: "kitchen",
    visible: false,
    soldOut: false,
    calories: 320,
    description: "کیک نرم با کرم پنیر و گردو.",
  },
];

function Pill({ children, muted = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none tracking-wide ${
        muted
          ? "border-neutral-300 text-neutral-500"
          : "border-neutral-900 text-neutral-900"
      }`}
    >
      {children}
    </span>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-[28px] border border-neutral-300 bg-[var(--paper)] shadow-[0_1px_0_rgba(0,0,0,0.03)] ${className}`}>
      <div className="border-b border-neutral-300 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-neutral-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Input({ label, value, placeholder }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className="rounded-2xl border border-neutral-300 bg-white/30 px-4 py-3 text-sm text-neutral-900">
        {value || placeholder}
      </div>
    </label>
  );
}

function Toggle({ on }) {
  return (
    <div
      className={`relative h-6 w-11 rounded-full border transition ${
        on ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-100"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--paper)] shadow-sm transition ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </div>
  );
}

export default function PersianCafeMenuDesignConcept() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[var(--paper)] text-neutral-950"
      style={{
        "--paper": "#f5f0e6",
        fontFamily:
          'Parastoo, "EB Garamond", "Times New Roman", serif',
      }}
    >
      <div className="mx-auto max-w-[1520px] px-5 py-6 lg:px-8 lg:py-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap');
        `}</style>

        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-900 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-neutral-900">
              <Moon className="h-3.5 w-3.5" />
              Ink on paper system
            </div>
            <h1 className="font-serif text-4xl leading-none tracking-tight text-neutral-950 lg:text-6xl">
              طراحی مدیریت منوی کافه
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700 lg:text-base">
              ساده، مینیمال، مدرن. بدون تصویر و بدون تزئینات اضافی؛ فقط تایپوگرافی، فضا، و سلسله‌مراتب روشن برای مدیریت منو و پیش‌نمایش QR.
            </p>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-2xl border border-neutral-300 bg-white/35 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Font stack</div>
              <div className="mt-1 text-sm text-neutral-900">Parastoo / EB Garamond</div>
            </div>
            <div className="rounded-2xl border border-neutral-300 bg-white/35 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Theme</div>
              <div className="mt-1 text-sm text-neutral-900">Paper / Ink</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Panel
              title="داشبورد مدیریت منو"
              subtitle="فلوهای اصلی: دسته‌بندی، آیتم‌ها، انتشار QR و کنترل وضعیت نمایش"
              className="overflow-hidden"
            >
              <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <aside className="rounded-[24px] border border-neutral-300 bg-white/30 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Categories</div>
                      <div className="mt-1 font-serif text-xl">دسته‌ها</div>
                    </div>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-900">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.nameFa}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-[var(--paper)] px-3 py-3"
                      >
                        <GripVertical className="h-4 w-4 text-neutral-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-neutral-950">{cat.nameFa}</div>
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {cat.count} آیتم · ترتیب نمایش
                          </div>
                        </div>
                        <Toggle on={cat.active} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-600">
                    Drag &amp; drop برای جابه‌جایی دسته‌ها
                  </div>
                </aside>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-neutral-300 bg-white/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-neutral-300 bg-[var(--paper)] p-2">
                        <Search className="h-4 w-4 text-neutral-700" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Items</div>
                        <div className="font-serif text-xl">آیتم‌ها</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-2 rounded-full border border-neutral-900 px-4 py-2 text-sm">
                        <SlidersHorizontal className="h-4 w-4" />
                        فیلتر
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-[var(--paper)]">
                        <Plus className="h-4 w-4" />
                        آیتم جدید
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-neutral-300 bg-[var(--paper)]">
                    <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.9fr_0.5fr] gap-3 border-b border-neutral-300 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      <div>نام</div>
                      <div>دسته</div>
                      <div>قیمت</div>
                      <div>ایستگاه</div>
                      <div>وضعیت</div>
                      <div className="text-left">...</div>
                    </div>

                    {items.map((item, idx) => (
                      <div
                        key={item.nameFa}
                        className={`grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.9fr_0.5fr] items-center gap-3 px-4 py-4 ${
                          idx !== items.length - 1 ? "border-b border-neutral-200" : ""
                        }`}
                      >
                        <div>
                          <div className="font-serif text-lg text-neutral-950">{item.nameFa}</div>
                          <div className="mt-1 text-sm text-neutral-600">{item.nameEn}</div>
                          <div className="mt-2 max-w-md text-xs leading-6 text-neutral-500">
                            {item.description}
                          </div>
                        </div>
                        <div className="text-sm text-neutral-800">{item.category}</div>
                        <div className="text-sm text-neutral-800">{item.price} تومان</div>
                        <div className="text-sm text-neutral-800">{item.station}</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Toggle on={item.visible} />
                            <span className="text-sm text-neutral-700">نمایش عمومی</span>
                          </div>
                          {item.soldOut ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-900 px-2.5 py-1 text-[11px]">
                              <AlertCircle className="h-3.5 w-3.5" />
                              ناموجود
                            </div>
                          ) : (
                            <Pill muted>available</Pill>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 text-neutral-700">
                          <button className="rounded-full border border-neutral-300 p-2">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-full border border-neutral-300 p-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-neutral-300 bg-white/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Bulk visibility</div>
                          <div className="mt-1 font-serif text-lg">نمایش گروهی</div>
                        </div>
                        <EyeOff className="h-4 w-4 text-neutral-700" />
                      </div>
                      <p className="text-sm leading-6 text-neutral-700">
                        مخفی کردن همه آیتم‌های بار در ساعات غیر فعال، بدون حذف داده.
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-neutral-300 bg-white/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Photo upload</div>
                          <div className="mt-1 font-serif text-lg">بارگذاری عکس</div>
                        </div>
                        <Upload className="h-4 w-4 text-neutral-700" />
                      </div>
                      <p className="text-sm leading-6 text-neutral-700">
                        تصویر فشرده، زیر ۲۰۰KB، برای استفاده سبک در CDN و بارگذاری سریع.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
              <Panel
                title="ویرایش QR منو"
                subtitle="Preview of the live public menu and publish controls"
              >
                <div className="space-y-4">
                  <Input label="Venue slug" value="menu.yourplatform.ir/nahal-cafe" />
                  <Input label="Welcome message" value="به ناهار کافه خوش آمدید" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-300 bg-white/30 p-4 text-sm text-neutral-700">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Publish</div>
                      فعال
                    </div>
                    <div className="rounded-2xl border border-neutral-300 bg-white/30 p-4 text-sm text-neutral-700">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">Menu URL</div>
                      ready
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="QR خروجی" subtitle="Generated client-side; downloadable as PNG or PDF">
                <div className="flex items-center gap-5">
                  <div className="grid h-40 w-40 place-items-center rounded-[28px] border border-neutral-900 bg-[var(--paper)]">
                    <div className="grid grid-cols-5 gap-1 p-4">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <span
                          key={i}
                          className={`block h-4 w-4 ${[0, 1, 2, 5, 7, 9, 10, 13, 14, 15, 17, 20, 22].includes(i) ? "bg-neutral-900" : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-neutral-700">
                    <div className="rounded-2xl border border-neutral-300 px-3 py-2">PNG</div>
                    <div className="rounded-2xl border border-neutral-300 px-3 py-2">PDF</div>
                    <div className="rounded-2xl border border-neutral-300 px-3 py-2">Venue name included</div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-6">
            <Panel
              title="پیش‌نمایش منوی عمومی موبایل"
              subtitle="Static CDN page, read-only, RTL, with sticky category navigation"
              className="sticky top-6"
            >
              <div className="mx-auto w-full max-w-[390px] rounded-[36px] border border-neutral-900 bg-[var(--paper)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                <div className="rounded-[28px] border border-neutral-900 bg-[var(--paper)] p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">mofé</div>
                      <h3 className="font-serif text-2xl leading-none text-neutral-950">کافه ناهال</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        به منوی ما خوش آمدید. سفارش فقط حضوری.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-neutral-900 p-2">
                      <QrCode className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="sticky top-0 z-10 mb-4 overflow-auto border-b border-neutral-300 pb-3">
                    <div className="flex gap-2 whitespace-nowrap">
                      {categories.map((cat, idx) => (
                        <span
                          key={cat.nameFa}
                          className={`rounded-full border px-3 py-2 text-[12px] ${
                            idx === 0
                              ? "border-neutral-900 bg-neutral-900 text-[var(--paper)]"
                              : "border-neutral-300 text-neutral-700"
                          }`}
                        >
                          {cat.nameFa}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <article
                        key={item.nameEn}
                        className={`rounded-[24px] border border-neutral-300 p-4 ${
                          item.soldOut ? "opacity-60 grayscale" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif text-xl text-neutral-950">{item.nameFa}</h4>
                              {item.soldOut ? (
                                <span className="rounded-full border border-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                                  ناموجود
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 font-serif text-sm text-neutral-600">{item.nameEn}</div>
                            <p className="mt-3 text-sm leading-6 text-neutral-700">{item.description}</p>
                          </div>
                          <div className="shrink-0 text-left">
                            <div className="font-serif text-lg text-neutral-950">{item.price}</div>
                            <div className="mt-2 text-xs text-neutral-500">تومان</div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          {item.calories ? <Pill>{item.calories} kcal</Pill> : null}
                          <Pill muted>{item.station === "bar" ? "bar" : "kitchen"}</Pill>
                          {item.visible ? <Pill muted>public</Pill> : <Pill muted>hidden</Pill>}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-neutral-300 pt-4 text-center text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    Powered by mofé
                  </div>
                </div>
              </div>
            </Panel>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
              <Panel title="Design rules" subtitle="System constraints translated into visual language">
                <div className="space-y-3 text-sm leading-6 text-neutral-700">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Off-white paper background with black typography only.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Serif-first hierarchy for both Persian and English text.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>No photography in the design system; code-driven UI blocks only.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>High contrast, low resource, compact surfaces for fast scanning.</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Navigation model" subtitle="Admin information architecture">
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3">
                    <span>Menu categories</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3">
                    <span>Item detail editor</span>
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3">
                    <span>QR publish / unpublish</span>
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3">
                    <span>Venue appearance</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

