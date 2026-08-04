"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpLeft,
  Building2,
  Check,
  ExternalLink,
  Globe2,
  ImagePlus,
  Palette,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { VenueInfoSection } from "./VenueInfoSection";
import { MembersSection } from "./MembersSection";
import { useStatusMessage } from "@/hooks/useStatusMessage";

interface Member {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
}

interface SettingsClientProps {
  venueId: string;
  nameFa: string;
  nameEn: string | null;
  slug: string;
  timezone: string;
  welcomeMessage: string | null;
  logoUrl: string | null;
  members: Member[];
  currentUserRole: string;
  currentUserId: string;
  publicMenuDomain: string;
}

const SETTING_SECTIONS: Array<{
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "venue", label: "اطلاعات مجموعه", description: "نام و منطقه زمانی", icon: Building2 },
  { id: "appearance", label: "ظاهر منو", description: "لوگو و پیام خوش‌آمد", icon: Palette },
  { id: "members", label: "اعضای تیم", description: "نقش‌ها و دسترسی‌ها", icon: Users },
  { id: "domain", label: "آدرس منو", description: "لینک منوی عمومی", icon: Globe2 },
];

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink">
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] tracking-wide text-ink-muted">{label}</p>
        <p className="mt-0.5 truncate font-serif text-xl leading-tight text-ink-strong">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

export function SettingsClient({
  venueId,
  nameFa: initialNameFa,
  nameEn: initialNameEn,
  slug,
  timezone: initialTimezone,
  welcomeMessage: initialWelcomeMessage,
  logoUrl: initialLogoUrl,
  members: initialMembers,
  currentUserRole,
  currentUserId,
  publicMenuDomain,
}: SettingsClientProps) {
  const router = useRouter();
  const [nameFa, setNameFa] = useState(initialNameFa);
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [venueStatus, setVenueStatus] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const { statusMessage: appearanceStatus, showStatus: showAppearanceStatus } = useStatusMessage();

  const [activeSection, setActiveSection] = useState("venue");

  useEffect(() => {
    const sections = SETTING_SECTIONS
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry) setActiveSection(visibleEntry.target.id);
      },
      { rootMargin: "-14% 0px -68% 0px", threshold: [0, 0.2, 0.5, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleSaveVenue = async () => {
    setVenueStatus("");
    const res = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameFa,
        nameEn: nameEn || null,
        timezone,
      }),
    });

    if (res.ok) {
      setVenueStatus("تغییرات ذخیره شد");
      setTimeout(() => setVenueStatus(""), 3000);
      router.refresh();
    } else {
      const data = await res.json();
      setVenueStatus(data.error || "خطا در ذخیره تغییرات");
    }
  };

  const handleSaveAppearance = async () => {
    const res = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        welcomeMessage: welcomeMessage || null,
      }),
    });

    if (res.ok) {
      showAppearanceStatus("تغییرات ذخیره شد");
      router.refresh();
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    const res = await fetch(`/api/venues/${venueId}/logo`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      showAppearanceStatus("لوگو با موفقیت آپلود شد");
      router.refresh();
    } else {
      const data = await res.json();
      showAppearanceStatus(data.error || "خطا در آپلود لوگو");
    }
    setUploading(false);
  };

  const handleLogoRemove = async () => {
    const res = await fetch(`/api/venues/${venueId}/logo`, {
      method: "DELETE",
    });

    if (res.ok) {
      setLogoUrl("");
      showAppearanceStatus("لوگو حذف شد");
      router.refresh();
    } else {
      showAppearanceStatus("خطا در حذف لوگو");
    }
  };

  const handleAddMember = async (data: { name: string; username: string; password: string; role: string }) => {
    const res = await fetch(`/api/venues/${venueId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const member = await res.json();
      setMembers((prev) => [
        ...prev,
        {
          id: member.id,
          userId: member.userId,
          role: member.role,
          name: member.user.name,
          email: member.user.email,
        },
      ]);
      router.refresh();
    } else {
      const err = await res.json();
      throw new Error(err.error || "خطا در افزودن عضو");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const res = await fetch(
      `/api/venues/${venueId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      }
    );

    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      router.refresh();
    } else {
      const err = await res.json();
      throw new Error(err.error || "خطا در تغییر نقش");
    }
  };

  const handleChangePassword = async (memberId: string, password: string) => {
    const res = await fetch(
      `/api/venues/${venueId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در تغییر رمز عبور");
    }
    router.refresh();
  };

  const handleRemoveMember = async (memberId: string) => {
    const res = await fetch(
      `/api/venues/${venueId}/members/${memberId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      router.refresh();
    } else {
      const err = await res.json();
      throw new Error(err.error || "خطا در حذف عضو");
    }
  };

  const displayName = nameEn.trim() || nameFa;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="relative overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-paper shadow-[0_18px_35px_rgba(17,17,17,0.14)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full border border-paper/10" />
        <div className="pointer-events-none absolute -bottom-20 right-[-2rem] h-48 w-48 rounded-full border-[22px] border-paper/5" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs tracking-[0.18em] text-paper/55">
              <Settings className="h-4 w-4" strokeWidth={1.7} />
              پنل مدیریت مجموعه
            </div>
            <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-paper sm:text-4xl">
              همه‌چیز برای یک منوی بهتر
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-paper/65">
              اطلاعات مجموعه، ظاهر منو و دسترسی تیم را از یکجا مدیریت کنید.
            </p>
          </div>

          <a
            href={publicMenuDomain}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-paper/25 bg-paper/10 px-4 py-2.5 text-sm text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            <Globe2 className="h-4 w-4" strokeWidth={1.7} />
            مشاهده منوی عمومی
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
          </a>
        </div>

        <div className="relative mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper/10 pt-4 text-xs text-paper/55">
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" strokeWidth={1.7} />
            {displayName}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-paper/30 sm:block" />
          <span dir="ltr" className="inline-flex items-center gap-2">
            /{slug}
          </span>
        </div>
      </header>

      <section
        aria-label="خلاصه تنظیمات"
        className="grid gap-3 sm:grid-cols-2"
      >
        <SummaryCard
          icon={Users}
          label="اعضای تیم"
          value={new Intl.NumberFormat("fa-IR").format(members.length)}
          detail="کاربر دسترسی‌دار"
        />
        <SummaryCard
          icon={ImagePlus}
          label="هویت بصری"
          value={logoUrl ? "آماده" : "قابل تکمیل"}
          detail={logoUrl ? "لوگو روی منو نمایش داده می‌شود" : "با افزودن لوگو شروع کنید"}
        />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_236px]">
        <aside className="order-first space-y-3 lg:order-last lg:sticky lg:top-5">
          <nav
            aria-label="بخش‌های تنظیمات"
            className="rounded-[var(--radius-panel)] border border-line bg-paper p-2 shadow-sm"
          >
            <div className="px-3 pb-2 pt-2">
              <p className="text-[11px] tracking-[0.16em] text-ink-muted">
                دسترسی سریع
              </p>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 lg:block lg:overflow-visible">
              {SETTING_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`group flex min-w-[142px] shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-right transition-colors lg:min-w-0 ${
                      isActive
                        ? "bg-ink text-paper"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? "bg-paper/10 text-paper" : "bg-surface text-ink"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {section.label}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[10px] ${
                          isActive ? "text-paper/55" : "text-ink-muted/80"
                        }`}
                      >
                        {section.description}
                      </span>
                    </span>
                    <ArrowUpLeft
                      className={`hidden h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 lg:block ${
                        isActive ? "text-paper/60" : "text-ink-muted/50"
                      }`}
                      strokeWidth={1.7}
                    />
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-ink">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
              <p className="text-sm font-medium">نکته</p>
            </div>
            <p className="mt-2 text-xs leading-6 text-ink-muted">
              تغییرات هر بخش جداگانه ذخیره می‌شوند و بلافاصله روی منوی عمومی اعمال خواهند شد.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div id="venue" className="scroll-mt-5">
            <VenueInfoSection
              nameFa={nameFa}
              nameEn={nameEn}
              timezone={timezone}
              venueStatus={venueStatus}
              onNameFaChange={setNameFa}
              onNameEnChange={setNameEn}
              onTimezoneChange={setTimezone}
              onSave={handleSaveVenue}
            />
          </div>

          <div id="appearance" className="scroll-mt-5">
            <Panel
              title="ظاهر منوی عمومی"
              subtitle="با یک پیام کوتاه و لوگوی مناسب، منوی مجموعه را شخصی‌تر کنید."
              className="overflow-hidden shadow-sm"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <label
                      htmlFor="welcome-message"
                      className="block text-xs tracking-[0.14em] text-ink-muted"
                    >
                      پیام خوش‌آمدگویی
                    </label>
                    <span className="text-[11px] text-ink-muted">
                      {welcomeMessage.length}/۲۲۰
                    </span>
                  </div>
                  <textarea
                    id="welcome-message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    maxLength={220}
                    rows={6}
                    placeholder="مثلاً: خوش آمدید؛ از منوی ما لذت ببرید."
                    className="mt-2 min-h-36 w-full resize-none rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm leading-7 text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  />
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    این پیام در ابتدای منوی عمومی مهمان‌ها نمایش داده می‌شود.
                  </p>
                </div>

                <div className="rounded-[22px] border border-dashed border-line bg-surface/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <ImagePlus className="h-4 w-4" strokeWidth={1.7} />
                    لوگوی مجموعه
                  </div>
                  <div className="mt-4 flex items-center gap-3 lg:block">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-paper text-ink-muted lg:h-28 lg:w-full">
                      {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={logoUrl}
                          alt="لوگوی مجموعه"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="h-7 w-7" strokeWidth={1.4} />
                      )}
                    </div>
                    <div className="min-w-0 lg:mt-3">
                      <p className="text-xs leading-5 text-ink-muted">
                        تصویر مربع، حداکثر ۵۰۰ پیکسل و کمتر از ۵۰ کیلوبایت.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-xs text-ink transition-colors hover:border-ink">
                          <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.7} />
                          {uploading ? "در حال آپلود..." : "انتخاب تصویر"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs text-ink-muted transition-colors hover:bg-paper hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button onClick={handleSaveAppearance}>
                  <Check className="h-4 w-4" strokeWidth={1.8} />
                  ذخیره ظاهر
                </Button>
                {appearanceStatus && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted" role="status" aria-live="polite">
                    <Check className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
                    {appearanceStatus}
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div id="members" className="scroll-mt-5">
            <MembersSection
              members={members}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              slug={slug}
              onAdd={handleAddMember}
              onRoleChange={handleChangeRole}
              onPasswordChange={handleChangePassword}
              onRemove={handleRemoveMember}
            />
          </div>

          <div id="domain" className="scroll-mt-5">
            <Panel
              title="آدرس منوی عمومی"
              subtitle="این لینک را در شبکه‌های اجتماعی و QR منو به اشتراک بگذارید."
              className="overflow-hidden shadow-sm"
            >
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-ink">
                  <Globe2 className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-muted">لینک فعال مجموعه</p>
                  <a
                    href={publicMenuDomain}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="mt-1 block truncate text-sm text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {publicMenuDomain}
                  </a>
                </div>
                <a
                  href={publicMenuDomain}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 text-xs text-ink transition-colors hover:border-ink"
                >
                  باز کردن
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                </a>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
