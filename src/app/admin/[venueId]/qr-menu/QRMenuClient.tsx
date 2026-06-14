"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QRCodeExport } from "@/components/ui/QRCodeExport";

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
    accentColor: string | null;
    publicStatus: string;
  };
  categories: PreviewCategory[];
}

interface QRMenuClientProps {
  venueId: string;
  venueNameFa: string;
  venueNameEn: string | null;
  venueWelcomeMessage: string | null;
  venueAccentColor: string | null;
  venuePublicStatus: string;
  venueSlug: string;
  canPublish: boolean;
  preview: PreviewData;
  hasUnpublishedChanges: boolean;
  lastPublicationCompletedAt: string | null;
  publicUrl: string;
}

export function QRMenuClient({
  venueId,
  venueNameFa: initialNameFa,
  venueNameEn: initialNameEn,
  venueWelcomeMessage: initialWelcomeMessage,
  venueAccentColor: initialAccentColor,
  venuePublicStatus,
  canPublish,
  preview,
  hasUnpublishedChanges,
  lastPublicationCompletedAt,
  publicUrl,
}: QRMenuClientProps) {
  const router = useRouter();
  const [nameFa, setNameFa] = useState(initialNameFa);
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialWelcomeMessage ?? ""
  );
  const [accentColor, setAccentColor] = useState(initialAccentColor ?? "");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSaveAppearance = async () => {
    const res = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameFa,
        nameEn: nameEn || null,
        welcomeMessage: welcomeMessage || null,
        accentColor: accentColor || null,
      }),
    });

    if (res.ok) {
      setStatusMessage("تغییرات ذخیره شد");
      setTimeout(() => setStatusMessage(""), 3000);
      router.refresh();
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/venues/${venueId}/publish`, {
      method: "POST",
    });

    if (res.ok) {
      setShowPublishModal(false);
      setStatusMessage("منو با موفقیت منتشر شد");
      setTimeout(() => setStatusMessage(""), 3000);
      router.refresh();
    } else {
      setStatusMessage("خطا در انتشار منو");
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
      setStatusMessage("منو از دسترس خارج شد");
      setTimeout(() => setStatusMessage(""), 3000);
      router.refresh();
    } else {
      setStatusMessage("خطا در لغو انتشار");
    }
    setPublishing(false);
  };

  const formatPrice = (price: number) => price.toLocaleString("fa-IR");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-6">
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
            <Input
              label="رنگ تأکید (اختیاری)"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#111111"
            />
            <Button onClick={handleSaveAppearance}>ذخیره تغییرات</Button>
            {statusMessage && (
              <p className="text-sm text-ink-muted">{statusMessage}</p>
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
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-ink-muted">
                  mofé
                </div>
                <h3 className="font-serif text-2xl leading-none text-ink-strong">
                  {preview.venue.nameFa}
                </h3>
                {preview.venue.welcomeMessage && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {preview.venue.welcomeMessage}
                  </p>
                )}
              </div>

              {preview.categories.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted">
                  منو خالی است
                </div>
              ) : (
                <div className="space-y-3">
                  {preview.categories.map((cat) => (
                    <div key={cat.id} className="mb-4">
                      <h4 className="mb-2 font-serif text-lg text-ink">
                        {cat.nameFa}
                      </h4>
                      {cat.items.map((item) => (
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
                  ))}
                </div>
              )}

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
