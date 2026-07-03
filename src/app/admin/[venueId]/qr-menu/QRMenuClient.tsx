"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QRCodeExport } from "@/components/ui/QRCodeExport";
import { useStatusMessage } from "@/hooks/useStatusMessage";
import { formatPrice } from "@/lib/format";

interface PreviewCategory {
  id: string;
  nameFa: string;
  items: PreviewItem[];
}

interface PreviewItem {
  id: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceToman: number;
  station: string;
  calories: number | null;
  soldOut: boolean;
}

interface PreviewData {
  venue: {
    nameFa: string;
    nameEn: string | null;
    welcomeMessage: string | null;
    publicStatus: string;
  };
  categories: PreviewCategory[];
}

interface Publication {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  createdAtLabel: string;
}

interface QRMenuClientProps {
  venueId: string;
  venueNameFa: string;
  venueNameEn: string | null;
  venueWelcomeMessage: string | null;
  venueLogoUrl: string | null;
  venuePublicStatus: string;
  venueSlug: string;
  canPublish: boolean;
  preview: PreviewData;
  hasUnpublishedChanges: boolean;
  lastPublicationCompletedAt: string | null;
  publicUrl: string;
  publications: Publication[];
}

export function QRMenuClient({
  venueId,
  venueNameFa: initialNameFa,
  venueNameEn: initialNameEn,
  venueWelcomeMessage: initialWelcomeMessage,
  venueLogoUrl: initialLogoUrl,
  venuePublicStatus,
  canPublish,
  preview,
  hasUnpublishedChanges,
  lastPublicationCompletedAt,
  publicUrl,
  publications,
}: QRMenuClientProps) {
  const [nameFa, setNameFa] = useState(initialNameFa);
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialWelcomeMessage ?? ""
  );
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { statusMessage: appearanceStatus, showStatus: showAppearanceStatus } = useStatusMessage();
  const { statusMessage: publishStatus, showStatus: showPublishStatus } = useStatusMessage();
  const router = useRouter();

  const handleSaveAppearance = async () => {
    const res = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameFa,
        nameEn: nameEn || null,
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

  const handlePublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/venues/${venueId}/publish`, {
      method: "POST",
    });

    if (res.ok) {
      setShowPublishModal(false);
      showPublishStatus("منو با موفقیت منتشر شد");
      router.refresh();
    } else {
      showPublishStatus("خطا در انتشار منو");
    }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/venues/${venueId}/unpublish`, {
      method: "POST",
    });

    if (res.ok) {
      setShowUnpublishModal(false);
      showPublishStatus("منو از دسترس خارج شد");
      router.refresh();
    } else {
      showPublishStatus("خطا در لغو انتشار");
    }
    setPublishing(false);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Panel title="تنظیمات ظاهری" subtitle="ویرایش اطلاعات نمایشی منو">
          <div className="space-y-4">
            <Input
              label="نام فارسی"
              value={nameFa}
              onChange={(e) => setNameFa(e.target.value)}
            />
            <Input
              label="نام انگلیسی (اختیاری)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
                پیام خوش‌آمدگویی
              </label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={220}
                rows={3}
                className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink resize-none focus:border-ink focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
                لوگوی مجموعه
              </label>
              {logoUrl && (
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={logoUrl}
                    alt="لوگو"
                    className="h-14 w-14 rounded-xl border border-line object-cover"
                  />
                  <button
                    onClick={handleLogoRemove}
                    className="text-xs text-ink-muted hover:text-ink transition-colors"
                  >
                    حذف لوگو
                  </button>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted hover:text-ink transition-colors">
                {uploading ? "در حال آپلود..." : "انتخاب تصویر"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-ink-muted">
                تصویر به 500×500 پیکسل و زیر 50KB فشرده می‌شود
              </p>
            </div>
            <Button onClick={handleSaveAppearance}>ذخیره تغییرات</Button>
            {appearanceStatus && (
              <p className="text-sm text-ink-muted">{appearanceStatus}</p>
            )}
          </div>
        </Panel>

        <Panel title="انتشار منو">
          <div className="space-y-4">
            {hasUnpublishedChanges && (
              <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-sm text-ink-muted">
                  ⚠️ تغییرات منتشرنشده وجود دارد
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {venuePublicStatus === "published" ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => setShowPublishModal(true)}
                    disabled={!canPublish}
                  >
                    انتشار مجدد
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowUnpublishModal(true)}
                    disabled={!canPublish}
                  >
                    لغو انتشار
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setShowPublishModal(true)}
                  disabled={!canPublish}
                >
                  انتشار منو
                </Button>
              )}
            </div>

            <div className="text-sm text-ink-muted">
              <p>وضعیت: {venuePublicStatus === "published" ? "منتشر شده" : venuePublicStatus === "unpublished" ? "منتشر نشده" : "پیش‌نویس"}</p>
              <p className="mt-1">
                آدرس عمومی:{" "}
                <span className="text-ink" dir="ltr">
                  {publicUrl}
                </span>
              </p>
              {lastPublicationCompletedAt && (
                <p className="mt-1">
                  آخرین انتشار:{" "}
                  {new Date(lastPublicationCompletedAt).toLocaleDateString(
                    "fa-IR"
                  )}
                </p>
              )}
            </div>
            {publishStatus && (
              <p className="mt-2 text-sm text-ink-muted">{publishStatus}</p>
            )}

            <div className="border-t border-line pt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between text-sm text-ink-muted hover:text-ink transition-colors"
              >
                <span>تاریخچه انتشار</span>
                <span className={`transition-transform ${showHistory ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {showHistory && (
                <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-line">
                  <div className="grid grid-cols-[1fr_90px_1fr] gap-2 border-b border-line bg-surface px-3 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted">
                    <div>تاریخ</div>
                    <div>وضعیت</div>
                    <div>علت</div>
                  </div>
                  {publications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-ink-muted">
                      هیچ انتشاری یافت نشد
                    </div>
                  ) : (
                    publications.map((pub, idx) => (
                      <div
                        key={pub.id}
                        className={`grid grid-cols-[1fr_90px_1fr] items-center gap-2 px-3 py-3 ${
                          idx !== publications.length - 1 ? "border-b border-line/50" : ""
                        }`}
                      >
                        <div className="text-sm text-ink">{pub.createdAtLabel}</div>
                        <div>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              pub.status === "published"
                                ? "bg-green-100 text-green-800"
                                : pub.status === "unpublished"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {pub.status === "published"
                              ? "منتشر شده"
                              : pub.status === "unpublished"
                                ? "منتشر نشده"
                                : "در صف"}
                          </span>
                        </div>
                        <div className="text-sm text-ink-muted">
                          {pub.trigger === "manual_publish" ? "انتشار" : "لغو انتشار"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="خروجی QR">
          <QRCodeExport
            publicUrl={publicUrl}
            venueName={nameFa}
            isUnpublished={venuePublicStatus !== "published"}
          />
        </Panel>
      </div>

      <div className="xl:sticky xl:top-6">
        <Panel title="پیش‌نمایش موبایل">
          <div className="mx-auto w-full max-w-[360px] rounded-[36px] border border-line bg-paper p-3">
            <div className="rounded-[28px] border border-line bg-paper p-4">
              <div className="mb-4 flex items-start gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="لوگو"
                    className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-lg border border-line flex items-center justify-center text-ink-muted">
                    <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                      <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="14.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="1.5" y="14.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="4" y="4" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="17" y="4" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="4" y="17" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="10" y="10" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="13" y="10" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="10" y="13" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                      <rect x="13" y="13" width="4.8" height="4.8" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-serif text-2xl leading-none text-ink-strong">
                    {preview.venue.nameFa}
                  </h3>
                  {preview.venue.welcomeMessage && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {preview.venue.welcomeMessage}
                    </p>
                  )}
                </div>
              </div>

              {(() => {
                const allItems = preview.categories.flatMap(cat =>
                  cat.items.map(item => ({ ...item, categoryId: cat.id }))
                );
                const visibleItems = allItems.slice(0, 5);
                const remaining = allItems.length - 5;
                const visibleIds = new Set(visibleItems.map(i => i.id));

                if (preview.categories.length === 0) {
                  return <div className="py-8 text-center text-sm text-ink-muted">منو خالی است</div>;
                }

                return (
                  <div className="space-y-3">
                    {preview.categories.map((cat) => {
                      const catVisible = visibleItems.filter(i => i.categoryId === cat.id);
                      if (catVisible.length === 0) return null;
                      return (
                        <div key={cat.id} className="mb-4">
                          <h4 className="mb-2 font-serif text-lg text-ink">{cat.nameFa}</h4>
                          {cat.items.filter(i => visibleIds.has(i.id)).map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-[var(--radius-card)] border p-4 mb-2 ${
                                item.soldOut
                                  ? "border-line opacity-60"
                                  : "border-line"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-serif text-xl text-ink">
                                      {item.nameFa}
                                    </h5>
                                    {item.soldOut && (
                                      <span className="rounded-full border border-ink px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                        ناموجود
                                      </span>
                                    )}
                                  </div>
                                  {item.nameEn && (
                                    <div className="mt-0.5 text-sm text-ink-muted">
                                      {item.nameEn}
                                    </div>
                                  )}
                                  {item.description && (
                                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0 text-left">
                                  <div className="font-serif text-lg text-ink">
                                    {formatPrice(item.priceToman)}
                                  </div>
                                  <div className="text-xs text-ink-muted">
                                    تومان
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                {item.calories && (
                                  <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-muted">
                                    {item.calories} kcal
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {remaining > 0 && (
                      <div className="text-center text-sm text-ink-muted py-1">
                        + {remaining} آیتم بیشتر
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-4 border-t border-line pt-4 text-center text-[11px] uppercase tracking-wider text-ink-muted">
                Powered by mofé
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Modal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
        title="انتشار منو"
        confirmLabel="انتشار"
        loading={publishing}
      >
        <p>
          با انتشار منو، نسخه جدید در آدرس عمومی قابل مشاهده خواهد بود.
          این تغییر بلافاصله اعمال می‌شود.
        </p>
      </Modal>

      <Modal
        open={showUnpublishModal}
        onClose={() => setShowUnpublishModal(false)}
        onConfirm={handleUnpublish}
        title="لغو انتشار"
        confirmLabel="لغو انتشار"
        confirmVariant="destructive"
        loading={publishing}
      >
        <p>
          با لغو انتشار، بازدیدکنندگان QR صفحه «منو در دسترس نیست» را
          مشاهده خواهند کرد.
        </p>
      </Modal>
    </div>
  );
}
