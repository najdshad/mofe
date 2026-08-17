"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Globe,
  ImagePlus,
  Link2,
  MessageSquareText,
  MonitorSmartphone,
  Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { VenueInfoSection } from "./VenueInfoSection";
import { useStatusMessage } from "@/hooks/useStatusMessage";
import { fetchApi } from "@/lib/fetch-api";

interface SettingsClientProps {
  venueId: string;
  nameFa: string;
  nameEn: string | null;
  slug: string;
  welcomeMessage: string | null;
  logoUrl: string | null;
  publicMenuDomain: string;
}

export function SettingsClient({
  venueId,
  nameFa: initialNameFa,
  nameEn: initialNameEn,
  slug,
  welcomeMessage: initialWelcomeMessage,
  logoUrl: initialLogoUrl,
  publicMenuDomain,
}: SettingsClientProps) {
  const router = useRouter();
  const [nameFa, setNameFa] = useState(initialNameFa);
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [venueStatus, setVenueStatus] = useState("");

  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const { statusMessage: appearanceStatus, showStatus: showAppearanceStatus } = useStatusMessage();

  const handleSaveVenue = async () => {
    setVenueStatus("");
    try {
      await fetchApi(`/api/venues/${venueId}`, {
        method: "PATCH",
        body: JSON.stringify({
          nameFa,
          nameEn: nameEn || null,
        }),
      });
      setVenueStatus("تغییرات ذخیره شد");
      setTimeout(() => setVenueStatus(""), 3000);
      router.refresh();
    } catch (e) {
      setVenueStatus(e instanceof Error ? e.message : "خطا در ذخیره تغییرات");
    }
  };

  const handleSaveAppearance = async () => {
    try {
      await fetchApi(`/api/venues/${venueId}`, {
        method: "PATCH",
        body: JSON.stringify({ welcomeMessage: welcomeMessage || null }),
      });
      showAppearanceStatus("تغییرات ذخیره شد");
      router.refresh();
    } catch (e) {
      showAppearanceStatus(e instanceof Error ? e.message : "خطا در ذخیره تغییرات");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const data = await fetchApi(`/api/venues/${venueId}/logo`, {
        method: "POST",
        body: formData,
      });
      setLogoUrl(data.logoUrl);
      showAppearanceStatus("لوگو با موفقیت آپلود شد");
      router.refresh();
    } catch (e) {
      showAppearanceStatus(e instanceof Error ? e.message : "خطا در آپلود لوگو");
    }
    setUploading(false);
  };

  const handleLogoRemove = async () => {
    try {
      await fetchApi(`/api/venues/${venueId}/logo`, { method: "DELETE" });
      setLogoUrl("");
      showAppearanceStatus("لوگو حذف شد");
      router.refresh();
    } catch (e) {
      showAppearanceStatus(e instanceof Error ? e.message : "خطا در حذف لوگو");
    }
  };

  const displayName = nameEn.trim() || nameFa;

  return (
    <div className="pb-10">
      <header className="flex flex-col gap-4 border-b border-line/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-accent">تنظیمات</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">هویت و ظاهر مجموعه</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            اطلاعات اصلی و تجربه‌ای را که مهمان‌ها در منوی دیجیتال می‌بینند مدیریت کنید.
          </p>
        </div>
        <a
          href={publicMenuDomain}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-white"
        >
          مشاهده منوی عمومی
          <ExternalLink className="h-4 w-4 text-ink-muted" strokeWidth={1.8} />
        </a>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <VenueInfoSection
            nameFa={nameFa}
            nameEn={nameEn}
            venueStatus={venueStatus}
            onNameFaChange={setNameFa}
            onNameEnChange={setNameEn}
            onSave={handleSaveVenue}
          />

          <Panel title="پیام خوش‌آمدگویی" subtitle="یک پیام کوتاه در ابتدای منو برای مهمان‌ها بنویسید.">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <MessageSquareText className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <div className="flex items-end justify-between gap-3">
                <label
                  htmlFor="welcome-message"
                  className="block text-xs font-medium text-ink-muted"
                >
                  متن پیام
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
                rows={5}
                placeholder="مثلاً: خوش آمدید؛ از منوی ما لذت ببرید."
                className="mt-2 min-h-32 w-full resize-none rounded-[var(--radius-control)] border border-line bg-white/70 px-3.5 py-3 text-sm leading-7 text-ink placeholder:text-ink-muted/45 transition-colors focus:border-accent/60 focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/10"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line/80 pt-4">
              <Button onClick={handleSaveAppearance}>
                <Check className="h-4 w-4" strokeWidth={1.8} />
                ذخیره پیام
              </Button>
              {appearanceStatus && (
                <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted" role="status" aria-live="polite">
                  <Check className="h-4 w-4 text-success" strokeWidth={1.8} />
                  {appearanceStatus}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="لوگوی مجموعه" subtitle="برای بهترین نتیجه از تصویر مربع استفاده کنید.">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-white text-ink-muted">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoUrl} alt="لوگوی مجموعه" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-7 w-7" strokeWidth={1.4} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs leading-5 text-ink-muted">
                  حداکثر ۵۰۰ پیکسل و کمتر از ۵۰ کیلوبایت.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/40 hover:bg-white">
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
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-xs text-ink-muted transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <section className="overflow-hidden rounded-[var(--radius-panel)] border border-ink bg-ink text-paper shadow-[0_14px_40px_rgba(17,17,17,0.12)]">
            <div className="flex items-center justify-between border-b border-paper/10 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <MonitorSmartphone className="h-4 w-4" strokeWidth={1.7} />
                پیش‌نمایش هویت
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper/10">
                  {logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Globe className="h-5 w-5 text-paper/60" strokeWidth={1.6} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{displayName}</p>
                  <p className="mt-1 text-xs text-paper/55">منوی دیجیتال مجموعه</p>
                </div>
              </div>
              {welcomeMessage && (
                <p className="mt-5 border-r-2 border-accent pr-3 text-xs leading-6 text-paper/65">
                  {welcomeMessage}
                </p>
              )}
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-paper/7 px-3 py-2.5 text-xs text-paper/55" dir="ltr">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">mofe.ir/m/{slug}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
