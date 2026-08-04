"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ROLE_LABELS } from "@/lib/constants";

interface Member {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
}

interface MembersSectionProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
  slug: string;
  onAdd: (data: { name: string; username: string; password: string; role: string }) => Promise<void>;
  onRoleChange: (memberId: string, role: string) => Promise<void>;
  onPasswordChange: (memberId: string, password: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export function MembersSection({
  members,
  currentUserId,
  currentUserRole,
  slug,
  onAdd,
  onRoleChange,
  onPasswordChange,
  onRemove,
}: MembersSectionProps) {
  const [addName, setAddName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("manager");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canManage = currentUserRole === "owner" || currentUserRole === "manager";
  const isOwner = currentUserRole === "owner";

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

  const handleAdd = async () => {
    if (!addUsername.trim() || !addName.trim() || !addPassword) return;
    setLoading(true);
    setError("");
    try {
      await onAdd({ name: addName.trim(), username: addUsername.trim(), password: addPassword, role: addRole });
      setAddName("");
      setAddUsername("");
      setAddPassword("");
      setShowAddModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
    setLoading(false);
  };

  const handlePassword = async () => {
    if (!memberToEdit || !newPassword) return;
    setLoading(true);
    setError("");
    try {
      await onPasswordChange(memberToEdit.id, newPassword);
      setShowPasswordModal(false);
      setMemberToEdit(null);
      setNewPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setLoading(true);
    setError("");
    try {
      await onRemove(memberToRemove.id);
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
    setLoading(false);
  };

  return (
    <>
      <Panel
        title="اعضای تیم"
        subtitle="افرادی که به مدیریت منو و مجموعه دسترسی دارند."
        className="overflow-hidden shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
            دسترسی‌ها را متناسب با نقش هر نفر تنظیم کنید.
          </div>
          <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink-muted">
            {members.length} عضو
          </span>
        </div>

        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/40 px-3.5 py-3 transition-colors hover:border-ink/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm ${
                    m.role === "owner"
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink"
                  }`}
                >
                  {m.name.trim().slice(0, 1) || "؟"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm text-ink">{m.name}</span>
                    {m.userId === currentUserId && (
                      <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-muted">
                        شما
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted" dir="ltr">
                    {m.email}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                {canChangeRoleOf(m) ? (
                  <select
                    value={m.role}
                    onChange={(e) => onRoleChange(m.id, e.target.value)}
                    aria-label={`نقش ${m.name}`}
                    className="rounded-full border border-line bg-paper px-3 py-2 text-xs text-ink-muted transition-colors focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    <option value="owner">مالک</option>
                    <option value="manager">مدیر</option>
                  </select>
                ) : (
                  <span className="rounded-full border border-line bg-paper px-3 py-2 text-xs text-ink-muted">
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
                {isOwner && m.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemberToEdit(m);
                      setNewPassword("");
                      setShowPasswordModal(true);
                    }}
                    aria-label={`تغییر رمز عبور ${m.name}`}
                    title="تغییر رمز عبور"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-ink-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    <KeyRound className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                )}
                {canDeleteMember(m) && m.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemberToRemove(m);
                      setShowRemoveModal(true);
                    }}
                    aria-label={`حذف ${m.name}`}
                    title="حذف عضو"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-ink-muted transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="mt-5 border-t border-line pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.8} />
              افزودن عضو جدید
            </Button>
          </div>
        )}

        {error && (
          <p
            className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </Panel>

      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setError("");
        }}
        onConfirm={handleAdd}
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
            dir="ltr"
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
            <label className="block text-xs tracking-[0.14em] text-ink-muted">
              نقش
            </label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
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
        onConfirm={handleRemove}
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
        onConfirm={handlePassword}
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
    </>
  );
}
