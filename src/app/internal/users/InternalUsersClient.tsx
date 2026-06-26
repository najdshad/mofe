"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export function InternalUsersClient({ users: initial }: { users: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/internal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا");
      }
      const created = await res.json();
      setUsers((prev) => [created, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink-strong">کاربران</h1>
          <p className="mt-1 text-sm text-ink-muted">همه حساب‌های کاربری سیستم</p>
        </div>
        <Button onClick={() => setShowModal(true)}>کاربر جدید</Button>
      </div>

      <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-2xl border border-line px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink">{u.name}</span>
                  {u.role === "internal" && (
                    <span className="rounded-full border border-ink/30 px-2 py-0.5 text-[10px] text-ink-muted">
                      داخلی
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">
                  {new Date(u.createdAt).toLocaleDateString("fa-IR")}
                </span>
                <span
                  className={`text-xs ${
                    u.status === "active" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {u.status === "active" ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setError("");
        }}
        onConfirm={handleCreate}
        title="کاربر جدید"
        confirmLabel="ایجاد"
        loading={loading}
      >
        <div className="space-y-4">
          <Input label="نام" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام صاحب کافه" />
          <Input label="ایمیل / نام کاربری" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          <Input label="رمز عبور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">نقش</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="user">کاربر عادی</option>
              <option value="internal">داخلی (پشتیبان)</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
