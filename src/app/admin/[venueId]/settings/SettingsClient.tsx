"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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
  publicStatus: string;
  members: Member[];
  currentUserRole: string;
  currentUserId: string;
}

const TIMEZONE_LABELS: Record<string, string> = {
  "Asia/Tehran": "تهران (UTC+3:30)",
  "Asia/Dubai": "دبی (UTC+4:00)",
  "Asia/Baghdad": "بغداد (UTC+3:00)",
  "Asia/Kabul": "کابل (UTC+4:30)",
  "Asia/Karachi": "کراچی (UTC+5:00)",
  "Asia/Yerevan": "ایروان (UTC+4:00)",
  "Europe/London": "لندن (UTC+1:00)",
  "Europe/Berlin": "برلین (UTC+2:00)",
  "Europe/Istanbul": "استانبول (UTC+3:00)",
  "America/New_York": "نیویورک (UTC-4:00)",
  "America/Los_Angeles": "لس آنجلس (UTC-7:00)",
  "Asia/Tokyo": "توکیو (UTC+9:00)",
  "Australia/Sydney": "سیدنی (UTC+10:00)",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالک",
  manager: "مدیر",
  staff: "کارمند",
};

export function SettingsClient({
  venueId,
  nameFa: initialNameFa,
  nameEn: initialNameEn,
  slug,
  timezone: initialTimezone,
  plan,
  publicStatus,
  members: initialMembers,
  currentUserRole,
  currentUserId,
}: SettingsClientProps) {
  const router = useRouter();
  const [nameFa, setNameFa] = useState(initialNameFa);
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [venueStatus, setVenueStatus] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!addEmail.trim() || !addName.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/venues/${venueId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword || undefined,
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
      setAddEmail("");
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

      <Panel title="دامنه">
        <p className="text-sm text-ink-muted">
          دامنه پیش‌فرض:{" "}
          <span dir="ltr" className="text-ink">
            menu.mofe.ir/{slug}
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
            label="ایمیل کاربر"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <Input
            label="رمز عبور (برای کاربر جدید)"
            type="password"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
            helperText="اگر کاربر قبلاً ثبت‌نام کرده است، رمز عبور الزامی نیست"
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
    </div>
  );
}
