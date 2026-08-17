"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { fetchApi } from "@/lib/fetch-api";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await fetchApi("/api/auth/logout", { method: "POST", redirect: "manual" });
        } catch {
          // 307 redirect or empty body; session already destroyed
        }
        router.push("/login");
      }}
      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-700"
      aria-label="خروج از حساب"
      title="خروج"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}