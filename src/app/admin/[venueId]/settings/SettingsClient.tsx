"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { VenueInfoSection } from "./VenueInfoSection";
import { MembersSection } from "./MembersSection";
import { ScheduleSection } from "./ScheduleSection";
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
  subscription: { plan: { customDomain: boolean; orderingEnabled: boolean } } | null;
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
  subscription,
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

  const [schedules, setSchedules] = useState<{ station: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState("");

  useEffect(() => {
    fetch(`/api/venues/${venueId}/schedules`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSchedules(data);
      })
      .catch((e) => console.error("Failed to load schedules:", e));
  }, [venueId]);

  const handleScheduleToggle = (station: string, dayOfWeek: number) => {
    setSchedules((prev) => {
      const existing = prev.find((s) => s.station === station && s.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((s) =>
          s.station === station && s.dayOfWeek === dayOfWeek
            ? { ...s, isActive: !s.isActive }
            : s
        );
      }
      return [...prev, { station, dayOfWeek, startTime: "07:00", endTime: "23:30", isActive: true }];
    });
  };

  const handleScheduleTime = (station: string, dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedules((prev) => {
      const existing = prev.find((s) => s.station === station && s.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((s) =>
          s.station === station && s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
        );
      }
      return [...prev, { station, dayOfWeek, startTime: field === "startTime" ? value : "07:00", endTime: field === "endTime" ? value : "23:30", isActive: true }];
    });
  };

  const handleApplyAll = (station: string, startTime: string, endTime: string, isActive: boolean) => {
    setSchedules((prev) => {
      const days = [0, 1, 2, 3, 4, 5, 6];
      const updated = [...prev];
      for (const day of days) {
        const idx = updated.findIndex((s) => s.station === station && s.dayOfWeek === day);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], startTime, endTime, isActive };
        } else {
          updated.push({ station, dayOfWeek: day, startTime, endTime, isActive });
        }
      }
      return updated;
    });
  };

  const handleSaveSchedules = async () => {
    setScheduleLoading(true);
    setScheduleStatus("");
    try {
      const res = await fetch(`/api/venues/${venueId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });
      if (res.ok) {
        setScheduleStatus("ذخیره شد");
        setTimeout(() => setScheduleStatus(""), 3000);
      } else {
        const data = await res.json();
        setScheduleStatus(data.error || "خطا");
      }
    } catch {
      setScheduleStatus("خطا در ذخیره");
    } finally {
      setScheduleLoading(false);
    }
  };

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

  return (
    <div className="space-y-4 max-w-xl">
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

      <Panel title="تنظیمات ظاهری" subtitle="پیام خوش‌آمدگویی و لوگو">
        <div className="space-y-4">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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

      <ScheduleSection
        schedules={schedules}
        loading={scheduleLoading}
        status={scheduleStatus}
        onToggle={handleScheduleToggle}
        onTimeChange={handleScheduleTime}
        onApplyAll={handleApplyAll}
        onSave={handleSaveSchedules}
      />

      <Panel title="دامنه">
        <p className="text-sm text-ink-muted">
          دامنه پیش‌فرض:{" "}
          <span dir="ltr" className="text-ink">
            {publicMenuDomain}
          </span>
        </p>
        {subscription?.plan?.customDomain ? (
          <p className="mt-2 text-sm text-ink-muted">
            برای تنظیم دامنه اختصاصی با پشتیبانی تماس بگیرید.
          </p>
        ) : (
          <p className="mt-2 text-sm text-orange-600">
            دامنه اختصاصی فقط در طرح‌های حرفه‌ای و پریمیوم در دسترس است.
          </p>
        )}
      </Panel>
    </div>
  );
}
