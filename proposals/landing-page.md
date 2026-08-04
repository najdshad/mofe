# Landing Page Proposal — mofe.ir

**Goal:** Convert cafe/restaurant owners into signups. The page must earn trust in under 5 seconds and make the decision to register feel obvious and low-risk.

---

## Target Audience Personas

| Persona | Pain Point | What They Need |
|---------|-----------|----------------|
| **Roya** — cafe owner in Tehran, non-technical, runs a busy specialty coffee shop | Print menus are outdated before they arrive. She edits prices on Instagram stories constantly. | A set-it-and-forget-it digital menu her customers can actually use. |
| **Amir** — manager of a chain restaurant, tech-savvy | Menu prices change constantly across branches; printed menus and Instagram posts go stale. | Fast menu editing with variants, allergens, and one-click publish. |
| **Sara** — owns a small traditional tea house | Can't justify international SaaS prices. Doesn't need complexity, just a beautiful menu card for her regulars. | A free or very low-cost QR menu that matches her aesthetic. |

---

## Page Structure & Copy

### 1. Navigation

```
[mofé logo (EB Garamond serif)]     [قابلیت‌ها] [چگونه کار می‌کند] [قیمت‌ها] [شروع کنید →]
```

The nav is barely visible — just a thin `--line` border separates it from the hero. The logo uses `.font-serif` (EB Garamond). No hamburger menu on desktop. On mobile, condense to logo + CTA button only.

---

### 2. Hero Section

**Visual:** A single, high-quality mockup of a phone displaying the QR menu, held by a hand in a warm-lit cafe setting. The photo is full-bleed on the left (desktop) or above the copy (mobile). The paper-and-ink aesthetic means the photo should be warm, natural-light, un-retouched — like a good cafe photo on Instagram, not a stock photo.

**Headline** (large serif, ~72px on desktop):

> منوی کافه‌ات، همیشه روی موبایل مشتری‌هایت

**Subheadline** (~22px, ink-muted):

> یک بار منو را درست کن. کد QR بچسبان روی میز. هر تغییری دادنی، بلافاصله برای همه نمایش داده می‌شود. بدون اپلیکیشن، بدون هزینه چاپ، بدون سردرگمی.

**CTA buttons:**

- Primary: `"ثبت‌نام رایگان"`
- Secondary: `"مشاهده منوی نمونه"`

**Trust bar** (beneath CTA):

```
✦ مناسب کافه‌ها، رستوران‌ها، فست‌فودها و چای‌خانه‌ها
✦ بدون نیاز به کارت بانکی بین‌المللی
✦ فارسی کامل — از فونت تا تاریخ و واحد پول
```

**Copy rationale:** The hero leads with the *outcome* for the customer (menu on customer's phone), not the feature. The phrase "همیشه روی موبایل مشتری‌هایت" is emotionally resonant — it promises permanence and reach. The second line eliminates three core objections in one breath: "is it hard?" (یک بار درست کن), "will customers use it?" (بدون اپلیکیشن), "is it worth it?" (بدون هزینه چاپ). The trust bar is pure reassurance for the Iranian market — no international card needed, full Persian support, self-hosted infrastructure.

---

### 3. Pain Point Section (optional — could be woven into hero)

A brief bridge section that validates the visitor's frustration:

> **قبل از mofé:**
> منو چاپ می‌کنی ← قیمت‌ها عوض می‌شود ← منو باطل شده ← یا مشتری سردرگم است یا باید دوباره چاپ کنی.
>
> منو را در اینستاگرام می‌گذاری ← مشتری باید ورق بزند، زوم کند، پیام بدهد.
>
> **بعد از mofé:**
> یک بار تنظیم می‌کنی. تا همیشه.

---

### 4. How It Works

**Section label:** "چطور کار می‌کند — در سه قدم"

Three cards in a row (stack on mobile), each with a large number (`01`, `02`, `03`) in muted small caps:

> **۰۱ — منوی خود را بسازید**
> آیتم‌ها را اضافه کنید، دسته‌بندی کنید، قیمت بگذارید. عکس آپلود کنید. همه چیز در یک پنل ساده و سریع.

> **۰۲ — QR اختصاصی خود را دریافت کنید**
> یک کلیک. منوی شما به صورت یک صفحه HTML ایستاده و فوق‌العاده سبک منتشر می‌شود. لینک و کد QR مخصوص خود را دارید.

> **۰۳ — روی میز بچسبانید و تمام**
> مشتری اسکن می‌کند و منو را با تمام جزئیات می‌بیند — قیمت، کالری، مواد حساسیت‌زا، عکس. بدون نصب، بدون منتظر ماندن.

Each card: border `--line`, background `--paper`, rounded with `--radius-panel`, generous padding.

**Copy rationale:** Each step is a single concrete action → concrete benefit. "یک کلیک" and "بدون نصب" are reassurance anchors repeated throughout the entire page.

---

### 5. Features Grid

**Section label:** "چرا mofé فرق می‌کند"

A 2×2 grid (2-column desktop, 1-column mobile). Each card has a small monochrome Lucide icon above the title. No colors except ink and paper. A subtle border darkening on hover.

#### Card 1: منوی عمومی بدون JavaScript

> صفحه‌ای که مشتری می‌بیند صرفاً HTML ایستاده است. حدود ۱۰ کیلوبایت. روی 3G در یک ثانیه لود می‌شود. بدون ردپا، بدون تبلیغ، بدون منتظر ماندن.

#### Card 2: آپدیت آنی

> قیمت شکر را در پنل تغییر بده. یک دقیقه بعد، هر کس QR را اسکن کند قیمت جدید را می‌بیند. بدون چاپ، بدون استوری اینستاگرام.

#### Card 3: انواع، آلرژن و عکس

> برای هر آیتم انواع با قیمت مجزا تعریف کن (سینگل/داپل). برچسب آلرژن و عکس فشرده‌ی حداکثر ۵۰ کیلوبایت — همه جزئیات در منوی عمومی.

#### Card 4: ورود و خروج CSV

> منوی قبلی را در اکسل داری؟ CSV را آپلود کن، دسته‌ها خودکار ساخته می‌شوند. خروجی CSV هم برای بایگانی. با حفاظت در برابر تزریق فرمول.

---

### 6. Menu Preview Section

A full-width section with a side-by-side visual: admin panel (left) and the output QR menu (right). The admin side shows the clean management interface; the QR side shows what the customer sees on their phone.

> **چیزی که مشتری می‌بیند**
>
> یک منوی سیاه و سفید با خطوط ظریف و طراحی گرم. دقیقاً مثل یک منوی کاغذی خوب — اما همیشه به‌روز، همیشه در جیب مشتری.
>
> فونت‌های فارسی اختصاصی (پروانه، وزیرمتن) و انگلیسی (EB Garamond). فونت‌ها روی سرور خودمان میزبانی می‌شوند — وابستگی به هیچ CDN خارجی نداریم، تحریم‌پذیر نیست.

**Copy rationale:** Addresses the design-conscious cafe owner directly. "دقیقاً مثل یک منوی کاغذی خوب" validates their aesthetic standards. The mention of self-hosted fonts and sanction-proof infrastructure is a massive trust signal for Iranian business owners.

---

### 7. Social Proof / Testimonials (placeholder)

> **صاحبان کافه درباره mofé چه می‌گویند**
> (این بخش با اولین کاربران واقعی پر می‌شود)

For launch, use the demo venue as a case study: "کافه نقطه — یک کافه دمو با ۶۶ آیتم منوی متنوع. ببینید منوی mofé چطور کار می‌کند." Link to `/m/noghteh`.

---

### 8. Final CTA Section

> **آماده‌ای منوی کافه‌ات را دیجیتال کنی؟**
>
> رایگان شروع کن. بدون نیاز به کارت بانکی. یک کلیک شروع کن.
>
> `[شروع کنید ←]`

The button should be prominent — ink background, paper text, large padding.

Below: a secondary link for those who want to learn more: "هنوز سوال داری؟ به ما در تلگرام پیام بده @mofe"

---

### 9. Footer

```
mofé (EB Garamond logo)

منوی دیجیتال ساده برای کافه‌ها و رستوران‌های فارسی‌زبان

hello@mofe.ir    Telegram: @mofe    GitHub

© 2026 mofé
```

Divider: thin `--line` border. Three columns on desktop, stacked on mobile. Minimal.

---

## Design Direction for Designers

| Aspect | Direction |
|--------|-----------|
| **Tone** | Warm, editorial, calm. Think *The New Yorker* meets a Tehran specialty coffee shop. |
| **Typography** | EB Garamond for all headings (large, high contrast). Parastoo/Vazirmatn for body. Mix of Persian elegance and English classicism. |
| **Color** | Paper `#f5f0e6` background, ink `#111111` text, `#5f5a52` for muted text, `#d8d1c4` for borders. No accent color except possibly the CTA button (use ink background). |
| **Imagery** | One warm lifestyle photo hero (phone in hand in a cafe). All other UI shown as monochrome browser mockups — clean, high-contrast, with visible paper texture. |
| **Shapes** | Large border-radius (24-28px) for panels — `--radius-panel`. Thin `--line` borders. No shadows (use borders instead). |
| **Icons** | Lucide icons in monochrome. All stroke, no fill. |
| **Responsive** | Mobile-first. The hero must look amazing on a phone — that's where most cafe owners will first see it. Single column below 768px. |
| **Speed** | Lighthouse 95+ across all categories. No render-blocking resources. All fonts self-hosted. Zero external HTTP calls on first load (after the page is loaded, only the registration API call fires on submit). |
| **States** | Hover: border darkens slightly. Focus: obvious outline. Active: ink fills. Disabled: reduced contrast. |

---

## Copywriting Principles for This Page

1. **Always address the outcome, not the feature.**
   - Bad: "منوی شما به صورت HTML ایستاده با کش ۶۰ ثانیه سرو می‌شود"
   - Good: "مشتری تو یه ثانیه منو رو می‌بینه، بدون منتظر موندن"

2. **Objection handling is embedded, not separate.**
   - "بدون اپلیکیشن" kills the "do I need an app" objection
   - "بدون کارت بانکی بین‌المللی" kills the "can I even pay" objection
   - "فارسی کامل" kills the "is this really for Iran" objection

3. **Every section must answer: "why should I care?"**
   - Not "we use IntersectionObserver" → but "دسته‌ها خودشون هایلایت می‌شن"

4. **Repeat core benefits in different language across sections.**
   - Hero: "همیشه روی موبایل مشتری‌هایت"
   - How it works: "مشتری اسکن می‌کند و می‌بیند"
   - Features: "بدون چاپ، بدون استوری اینستاگرام"
   - CTA: "۱۴ روز رایگان"

5. **Short sentences. One idea per line. Persian first.**
   - "یک بار تنظیم می‌کنی. تا همیشه." — not a grammatically complex sentence, but powerful.
