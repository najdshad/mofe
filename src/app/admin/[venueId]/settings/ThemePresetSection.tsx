"use client";

import { Check, Contrast, Moon, Palette, Sun } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import {
  THEME_PRESETS,
  type ThemePresetKey,
} from "@/lib/themes";

interface ThemePresetSectionProps {
  selectedTheme: ThemePresetKey;
  isSaving: boolean;
  status: string;
  onSelect: (theme: ThemePresetKey) => void;
}

export function ThemePresetSection({
  selectedTheme,
  isSaving,
  status,
  onSelect,
}: ThemePresetSectionProps) {
  return (
    <Panel
      title="پوسته مجموعه"
      subtitle="یک حال‌وهوای هماهنگ برای پنل مدیریت و منوی مهمان‌ها انتخاب کنید."
    >
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Palette className="h-5 w-5" strokeWidth={1.7} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_PRESETS.map((preset) => {
          const selected = selectedTheme === preset.key;
          const { palette } = preset;

          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={selected}
              disabled={isSaving}
              onClick={() => onSelect(preset.key)}
              className="group rounded-2xl border p-3 text-right transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65"
              style={{
                backgroundColor: palette.panel,
                borderColor: selected ? palette.accent : palette.line,
                boxShadow: selected
                  ? `0 0 0 2px ${palette.accentSoft}`
                  : "0 1px 2px rgba(17, 17, 17, 0.03)",
                color: palette.ink,
              }}
            >
              <span
                className="block overflow-hidden rounded-xl border p-3"
                style={{
                  backgroundColor: palette.paper,
                  borderColor: palette.line,
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className="h-2.5 w-16 rounded-full"
                    style={{ backgroundColor: palette.ink }}
                  />
                  <span
                    className="h-7 w-7 rounded-lg"
                    style={{ backgroundColor: palette.accentSoft }}
                  />
                </span>
                <span className="mt-5 flex items-end justify-between gap-3">
                  <span className="space-y-1.5">
                    <span
                      className="block h-1.5 w-24 rounded-full"
                      style={{ backgroundColor: palette.line }}
                    />
                    <span
                      className="block h-1.5 w-16 rounded-full"
                      style={{ backgroundColor: palette.line }}
                    />
                  </span>
                  <span
                    className="h-6 w-14 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  />
                </span>
              </span>

              <span className="mt-3 flex items-start justify-between gap-3 px-0.5">
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="block text-sm font-bold">{preset.label}</span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        borderColor: palette.line,
                        color: palette.inkMuted,
                      }}
                    >
                      {palette.mode === "dark" ? (
                        <Moon className="h-3 w-3" strokeWidth={1.8} />
                      ) : (
                        <Sun className="h-3 w-3" strokeWidth={1.8} />
                      )}
                      {palette.mode === "dark" ? "تیره" : "روشن"}
                    </span>
                    {palette.contrast === "high" && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: palette.accentSoft,
                          color: palette.accent,
                        }}
                      >
                        <Contrast className="h-3 w-3" strokeWidth={1.8} />
                        کنتراست بالا
                      </span>
                    )}
                  </span>
                  <span
                    className="mt-1 block text-[11px] leading-5"
                    style={{ color: palette.inkMuted }}
                  >
                    {preset.description}
                  </span>
                </span>
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    color: selected ? palette.panel : "transparent",
                    backgroundColor: selected ? palette.accent : "transparent",
                    borderColor: selected ? palette.accent : palette.line,
                  }}
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" strokeWidth={2.2} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {status && (
        <p
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-muted"
          role="status"
          aria-live="polite"
        >
          <Check className="h-4 w-4 text-success" strokeWidth={1.8} />
          {status}
        </p>
      )}
    </Panel>
  );
}
