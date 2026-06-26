"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { VenueInfoSection } from "./VenueInfoSection";
import { MembersSection } from "./MembersSection";
import { ScheduleSection } from "./ScheduleSection";

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
  plan: string;
  menuPhotoMode: boolean;
  members: Member[];
  currentUserRole: string;
  currentUserId: string;
  publicMenuDomain: string;
}

export function SettingsClient({
  venueId,
  nameFa: initialNameFa,
  nameEn: initialNameEn,
  slug,
  timezone: initialTimezone,
  plan,
  menuPhotoMode: initialMenuPhotoMode,
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
  const [menuPhotoMode, setMenuPhotoMode] = useState(initialMenuPhotoMode);
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const [schedules, setSchedules] = useState<{ station: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState("");

  useEffect(() => {
    fetch(`/api/venues/${venueId}/schedules`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSchedules(data);
      })
      .catch(() => {});
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
      return [...prev, { station, dayOfWeek, startTime: "08:00", endTime: "23:00", isActive: true }];
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
      return [...prev, { station, dayOfWeek, startTime: field === "startTime" ? value : "08:00", endTime: field === "endTime" ? value : "23:00", isActive: true }];
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
        menuPhotoMode,
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
    <div className="space-y-6 max-w-2xl">
      <VenueInfoSection
        nameFa={nameFa}
        nameEn={nameEn}
        timezone={timezone}
        menuPhotoMode={menuPhotoMode}
        venueStatus={venueStatus}
        onNameFaChange={setNameFa}
        onNameEnChange={setNameEn}
        onTimezoneChange={setTimezone}
        onMenuPhotoModeChange={setMenuPhotoMode}
        onSave={handleSaveVenue}
      />

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
        onSave={handleSaveSchedules}
      />

      <Panel title="دامنه">
        <p className="text-sm text-ink-muted">
          دامنه پیش‌فرض:{" "}
          <span dir="ltr" className="text-ink">
            {publicMenuDomain}
          </span>
        </p>
        {plan !== "starter" && (
          <p className="mt-2 text-sm text-ink-muted">
            برای تنظیم دامنه اختصاصی با پشتیبانی تماس بگیرید.
          </p>
        )}
      </Panel>
    </div>
  );
}
