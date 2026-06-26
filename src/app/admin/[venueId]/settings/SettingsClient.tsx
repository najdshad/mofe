"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { TIMEZONE_LABELS, ROLE_LABELS, STATION_LABELS, DAY_LABELS } from "@/lib/constants";

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
  const [addName, setAddName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const canManage = currentUserRole === "owner" || currentUserRole === "manager";
  const isOwner = currentUserRole === "owner";

  const handleSaveVenue = async () => {
    setVenueStatus("");
    setError("");
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
      setError(data.error || "خطا در ذخیره تغییرات");
    }
  };

  const handleAddMember = async () => {
    if (!addUsername.trim() || !addName.trim() || !addPassword) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/venues/${venueId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName.trim(),
        username: addUsername.trim(),
        password: addPassword,
        role: addRole,
      }),
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
      setAddName("");
      setAddUsername("");
      setAddPassword("");
      setShowAddModal(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "خطا در افزودن عضو");
    }
    setLoading(false);
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    setError("");
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
      const data = await res.json();
      setError(data.error || "خطا در تغییر نقش");
    }
  };

  const handleChangePassword = async () => {
    if (!memberToEdit || !newPassword) return;
    setLoading(true);
    setError("");

    const res = await fetch(
      `/api/venues/${venueId}/members/${memberToEdit.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    if (res.ok) {
      setShowPasswordModal(false);
      setMemberToEdit(null);
      setNewPassword("");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "خطا در تغییر رمز عبور");
    }
    setLoading(false);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setLoading(true);
    setError("");

    const res = await fetch(
      `/api/venues/${venueId}/members/${memberToRemove.id}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setShowRemoveModal(false);
      setMemberToRemove(null);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "خطا در حذف عضو");
    }
    setLoading(false);
  };

  const canDeleteMember = (member: Member) => {
    if (!canManage) return false;
    if (member.role === "owner" && !isOwner) return false;
    return true;
  };

  const canChangeRoleOf = (member: Member) => {
    if (!canManage) return false;
    if (member.role === "owner" && !isOwner) return false;
    return true;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Panel title="اطلاعات مجموعه" subtitle="ویرایش مشخصات مجموعه">
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
              منطقه زمانی
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {Object.entries(TIMEZONE_LABELS).map(([tz, label]) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
            <Toggle
              on={menuPhotoMode}
              onChange={(v) => setMenuPhotoMode(v)}
            />
            <div>
              <div className="text-sm text-ink">نمایش عکس آیتم‌ها در منوی عمومی</div>
              <div className="text-xs text-ink-muted">با فعال‌سازی، عکس آیتم‌ها در منوی منتشر شده نمایش داده می‌شود</div>
            </div>
          </div>
          <Button onClick={handleSaveVenue}>ذخیره تغییرات</Button>
          {venueStatus && (
            <p className="text-sm text-ink-muted">{venueStatus}</p>
          )}
        </div>
      </Panel>

      <Panel title="اعضا" subtitle="مدیریت دسترسی کاربران">
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border border-line px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink">{m.name}</span>
                  {m.userId === currentUserId && (
                    <span className="text-[10px] text-ink-muted">(شما)</span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {canChangeRoleOf(m) ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.id, e.target.value)}
                    className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted bg-transparent focus:border-ink focus:outline-none"
                  >
                    <option value="owner">مالک</option>
                    <option value="manager">مدیر</option>
                    <option value="staff">کارمند</option>
                  </select>
                ) : (
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
                {isOwner && m.userId !== currentUserId && (
                  <button
                    onClick={() => {
                      setMemberToEdit(m);
                      setNewPassword("");
                      setShowPasswordModal(true);
                    }}
                    className="text-xs text-ink-muted hover:text-ink transition-colors"
                  >
                    رمز
                  </button>
                )}
                {canDeleteMember(m) && m.userId !== currentUserId && (
                  <button
                    onClick={() => {
                      setMemberToRemove(m);
                      setShowRemoveModal(true);
                    }}
                    className="text-xs text-ink-muted hover:text-ink transition-colors"
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              افزودن عضو
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </Panel>

      <Panel title="زمان‌بندی ایستگاه‌ها" subtitle="تنظیم ساعات فعالیت آشپزخانه و بار">
        <div className="space-y-4">
          {["kitchen", "bar"].map((station) => (
            <div key={station}>
              <h4 className="mb-2 text-sm text-ink">{STATION_LABELS[station] || station}</h4>
              <div className="space-y-1">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const s = schedules.find((sch) => sch.station === station && sch.dayOfWeek === day);
                  const active = s?.isActive ?? false;
                  return (
                    <div key={day} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                      <Toggle on={active} onChange={() => handleScheduleToggle(station, day)} />
                      <span className="w-20 text-xs text-ink">{DAY_LABELS[day]}</span>
                      {active && (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={s?.startTime ?? "08:00"}
                            onChange={(e) => handleScheduleTime(station, day, "startTime", e.target.value)}
                            className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                          />
                          <span className="text-xs text-ink-muted">تا</span>
                          <input
                            type="time"
                            value={s?.endTime ?? "23:00"}
                            onChange={(e) => handleScheduleTime(station, day, "endTime", e.target.value)}
                            className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveSchedules} disabled={scheduleLoading}>
              {scheduleLoading ? "..." : "ذخیره زمان‌بندی"}
            </Button>
            {scheduleStatus && <span className="text-xs text-ink-muted">{scheduleStatus}</span>}
          </div>
        </div>
      </Panel>

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

      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setError("");
        }}
        onConfirm={handleAddMember}
        title="افزودن عضو"
        confirmLabel="افزودن"
        loading={loading}
      >
        <div className="space-y-4">
          <Input
            label="نام"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="نام کاربر"
          />
          <Input
            label="نام کاربری"
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            placeholder="username"
            helperText={
              addUsername.trim()
                ? `ایمیل: ${addUsername.trim()}@${slug}`
                : "فقط حروف انگلیسی، اعداد، خط تیره"
            }
          />
          <Input
            label="رمز عبور"
            type="password"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
              نقش
            </label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="staff">کارمند</option>
              <option value="manager">مدیر</option>
              {isOwner && <option value="owner">مالک</option>}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>

      <Modal
        open={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
          setError("");
        }}
        onConfirm={handleRemoveMember}
        title="حذف عضو"
        confirmLabel="حذف"
        confirmVariant="destructive"
        loading={loading}
      >
        <p>
          آیا از حذف {memberToRemove?.name} از مجموعه اطمینان دارید؟
        </p>
      </Modal>

      <Modal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setMemberToEdit(null);
          setNewPassword("");
          setError("");
        }}
        onConfirm={handleChangePassword}
        title="تغییر رمز عبور"
        confirmLabel="ذخیره"
        loading={loading}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            تغییر رمز عبور برای {memberToEdit?.name}
          </p>
          <Input
            label="رمز عبور جدید"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
