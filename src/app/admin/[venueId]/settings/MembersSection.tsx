"use client";

import { useState } from "react";
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
  const [addRole, setAddRole] = useState("staff");
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
                    onChange={(e) => onRoleChange(m.id, e.target.value)}
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
