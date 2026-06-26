"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { STATUS_LABELS } from "@/lib/constants";

interface Member {
  user: { id: string; name: string; email: string };
}

interface Venue {
  id: string;
  nameFa: string;
  nameEn: string | null;
  slug: string;
  publicStatus: string;
  timezone: string;
  createdAt: string;
  members: Member[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function InternalVenuesClient({
  venues: initial,
  users,
}: {
  venues: Venue[];
  users: User[];
}) {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState(users[0]?.email ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateSlug = (fa: string) =>
    fa
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "") || "venue";

  const handleCreate = async () => {
    if (!nameFa.trim() || !slug.trim() || !ownerEmail) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/internal/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameFa: nameFa.trim(),
          nameEn: nameEn.trim() || null,
          slug: slug.trim(),
          ownerEmail: ownerEmail.trim(),
          welcomeMessage: welcomeMessage.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا");
      }
      const created = await res.json();
      setVenues((prev) => [
        { ...created, members: [{ user: users.find((u) => u.email === ownerEmail) ?? { id: "", name: "", email: ownerEmail } }] },
        ...prev,
      ]);
      setNameFa("");
      setNameEn("");
      setSlug("");
      setOwnerEmail(users[0]?.email ?? "");
      setWelcomeMessage("");
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
          <h1 className="font-serif text-2xl text-ink-strong">مجموعه‌ها</h1>
          <p className="mt-1 text-sm text-ink-muted">کافه‌ها و رستوران‌های ثبت شده</p>
        </div>
        <Button onClick={() => setShowModal(true)}>مجموعه جدید</Button>
      </div>

      <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
        <div className="space-y-2">
          {venues.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-2xl border border-line px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink">{v.nameFa}</span>
                  {v.nameEn && <span className="text-xs text-ink-muted">{v.nameEn}</span>}
                </div>
                <div className="text-xs text-ink-muted">
                  {v.slug} · {v.members.map((m) => m.user.name).join("، ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
                  {STATUS_LABELS[v.publicStatus] || v.publicStatus}
                </span>
                <span className="text-xs text-ink-muted">
                  {new Date(v.createdAt).toLocaleDateString("fa-IR")}
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
        title="مجموعه جدید"
        confirmLabel="ایجاد"
        loading={loading}
      >
        <div className="space-y-4">
          <Input
            label="نام فارسی"
            value={nameFa}
            onChange={(e) => {
              setNameFa(e.target.value);
              if (!slug || slug === generateSlug(nameFa)) {
                setSlug(generateSlug(e.target.value));
              }
            }}
            placeholder="مثلاً: کافه نقطه"
          />
          <Input label="نام انگلیسی (اختیاری)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Noghteh Cafe" />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="noghteh" helperText="فقط حروف انگلیسی، اعداد و خط تیره" />
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">مالک</label>
            <select
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-muted">ابتدا باید حساب کاربری صاحب کافه را در بخش کاربران ایجاد کنید.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">پیام خوش‌آمدگویی (اختیاری)</label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="به منوی ما خوش آمدید..."
              rows={2}
              className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
