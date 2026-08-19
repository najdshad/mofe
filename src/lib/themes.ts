import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeContrast = "standard" | "high";

export interface ThemePalette {
  mode: ThemeMode;
  contrast: ThemeContrast;
  paper: string;
  ink: string;
  inkStrong: string;
  inkMuted: string;
  line: string;
  surface: string;
  canvas: string;
  panel: string;
  accent: string;
  accentSoft: string;
  success: string;
}

export const THEME_PRESETS = [
  {
    key: "classic",
    label: "سفال",
    description: "گرم، صمیمی و نزدیک به هویت اصلی موفه",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f5f0e6",
      ink: "#111111",
      inkStrong: "#000000",
      inkMuted: "#5f5a52",
      line: "#d8d1c4",
      surface: "rgba(255, 255, 255, 0.28)",
      canvas: "#efede7",
      panel: "#fbfaf7",
      accent: "#b94f2c",
      accentSoft: "#f4ded4",
      success: "#287451",
    },
  },
  {
    key: "olive",
    label: "زیتون",
    description: "آرام و طبیعی برای فضاهای روشن و سبز",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f2f1e8",
      ink: "#182019",
      inkStrong: "#0d130e",
      inkMuted: "#5d655c",
      line: "#ced0c3",
      surface: "rgba(255, 255, 255, 0.3)",
      canvas: "#e8e8dc",
      panel: "#faf9f3",
      accent: "#4f6f52",
      accentSoft: "#dde8dc",
      success: "#2f7451",
    },
  },
  {
    key: "saffron",
    label: "زعفران",
    description: "روشن و خوش‌انرژی با گرمای طلایی ملایم",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f7f0df",
      ink: "#201a12",
      inkStrong: "#120e09",
      inkMuted: "#6b6255",
      line: "#ddd2bf",
      surface: "rgba(255, 255, 255, 0.3)",
      canvas: "#eee6d5",
      panel: "#fdfaf2",
      accent: "#a96818",
      accentSoft: "#f3dfbd",
      success: "#39704f",
    },
  },
  {
    key: "pomegranate",
    label: "انار",
    description: "ظریف و متمایز با رنگی عمیق و مهمان‌نواز",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f5eeee",
      ink: "#24191c",
      inkStrong: "#160d10",
      inkMuted: "#6b5c60",
      line: "#d9c9cc",
      surface: "rgba(255, 255, 255, 0.3)",
      canvas: "#ece3e4",
      panel: "#fcf8f7",
      accent: "#8b3f50",
      accentSoft: "#eed7dc",
      success: "#317052",
    },
  },
  {
    key: "high-contrast",
    label: "کنتراست روشن",
    description: "مرزبندی واضح و خوانایی بیشتر برای استفاده روزمره",
    palette: {
      mode: "light",
      contrast: "high",
      paper: "#fffdf7",
      ink: "#080808",
      inkStrong: "#000000",
      inkMuted: "#343434",
      line: "#8a857b",
      surface: "rgba(255, 255, 255, 0.72)",
      canvas: "#f1efe9",
      panel: "#ffffff",
      accent: "#9d2f0e",
      accentSoft: "#ffe0d3",
      success: "#005a32",
    },
  },
  {
    key: "high-contrast-dark",
    label: "کنتراست تیره",
    description: "تیره، پرقدرت و مناسب خوانایی در نور کم",
    palette: {
      mode: "dark",
      contrast: "high",
      paper: "#101010",
      ink: "#f8f5ee",
      inkStrong: "#ffffff",
      inkMuted: "#d6d1c8",
      line: "#77736b",
      surface: "rgba(255, 255, 255, 0.1)",
      canvas: "#080808",
      panel: "#1b1b1b",
      accent: "#ff9a73",
      accentSoft: "#5a2d20",
      success: "#7ee2ae",
    },
  },
  {
    key: "midnight",
    label: "نیمه‌شب",
    description: "تیره و آرام با حال‌وهوای آبی برای شب‌های طولانی",
    palette: {
      mode: "dark",
      contrast: "standard",
      paper: "#121722",
      ink: "#edf2f7",
      inkStrong: "#ffffff",
      inkMuted: "#aeb9ca",
      line: "#3c485b",
      surface: "rgba(255, 255, 255, 0.08)",
      canvas: "#0b0f17",
      panel: "#1a2130",
      accent: "#78b7ff",
      accentSoft: "#233c5a",
      success: "#74d8a1",
    },
  },
  {
    key: "espresso",
    label: "اسپرسو",
    description: "تیره و گرم با رنگ‌های قهوه‌ای و مسی",
    palette: {
      mode: "dark",
      contrast: "standard",
      paper: "#1d1714",
      ink: "#f5ede4",
      inkStrong: "#fffaf3",
      inkMuted: "#c4b5a8",
      line: "#594940",
      surface: "rgba(255, 255, 255, 0.08)",
      canvas: "#120e0c",
      panel: "#28201c",
      accent: "#f1a36d",
      accentSoft: "#5c3424",
      success: "#8ed2a9",
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  description: string;
  palette: ThemePalette;
}[];

export type ThemePresetKey = (typeof THEME_PRESETS)[number]["key"];

export const DEFAULT_THEME_PRESET: ThemePresetKey = "classic";

const THEME_PRESET_KEYS = new Set<string>(
  THEME_PRESETS.map((preset) => preset.key)
);

export function isThemePresetKey(value: unknown): value is ThemePresetKey {
  return typeof value === "string" && THEME_PRESET_KEYS.has(value);
}

export function normalizeThemePreset(value: unknown): ThemePresetKey {
  return isThemePresetKey(value) ? value : DEFAULT_THEME_PRESET;
}

export function getThemePreset(value: unknown) {
  const key = normalizeThemePreset(value);
  return THEME_PRESETS.find((preset) => preset.key === key) ?? THEME_PRESETS[0];
}

function sanitizeHexColor(value: string | null | undefined): string | null {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return value.toLowerCase();
}

function mixHex(foreground: string, background: string, weight: number): string {
  const channel = (hex: string, start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  const mixed = [1, 3, 5].map((start) =>
    Math.round(channel(foreground, start) * weight + channel(background, start) * (1 - weight))
      .toString(16)
      .padStart(2, "0")
  );
  return `#${mixed.join("")}`;
}

export function resolveVenueTheme(
  themeId: unknown,
  legacyAccentColor?: string | null
): ThemePalette {
  const palette = getThemePreset(themeId).palette;
  const accent = sanitizeHexColor(legacyAccentColor);

  if (!accent) return palette;

  return {
    ...palette,
    accent,
    accentSoft: mixHex(accent, palette.paper, 0.16),
  };
}

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function themeStyleVariables(palette: ThemePalette): ThemeStyle {
  return {
    "--paper": palette.paper,
    "--ink": palette.ink,
    "--ink-strong": palette.inkStrong,
    "--ink-muted": palette.inkMuted,
    "--line": palette.line,
    "--surface": palette.surface,
    "--canvas": palette.canvas,
    "--panel": palette.panel,
    "--accent": palette.accent,
    "--accent-soft": palette.accentSoft,
    "--success": palette.success,
  };
}
