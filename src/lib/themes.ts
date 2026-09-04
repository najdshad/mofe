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
  control: string;
  controlHover: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  emphasis: string;
  emphasisInk: string;
}

export const THEME_PRESETS = [
  {
    key: "classic",
    label: "سفال",
    description: "گرم، صمیمی و نزدیک به هویت اصلی موفه",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f4efe6",
      ink: "#211b17",
      inkStrong: "#120e0b",
      inkMuted: "#6b625b",
      line: "#d8cec1",
      surface: "#e9e1d6",
      canvas: "#eae4da",
      panel: "#faf7f1",
      control: "#f1ebe2",
      controlHover: "#e8ded2",
      accent: "#a8462a",
      accentSoft: "#f2d8ce",
      accentInk: "#fff9f5",
      success: "#2f7250",
      successSoft: "#dcebe2",
      danger: "#a43d35",
      dangerSoft: "#f3ddda",
      emphasis: "#2a211c",
      emphasisInk: "#fffaf5",
    },
  },
  {
    key: "olive",
    label: "زیتون",
    description: "آرام و طبیعی برای فضاهای روشن و سبز",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f1f0e7",
      ink: "#1d241d",
      inkStrong: "#101610",
      inkMuted: "#626b61",
      line: "#cdd0c2",
      surface: "#e2e4d8",
      canvas: "#e7e8dd",
      panel: "#f8f8f1",
      control: "#eef0e6",
      controlHover: "#e3e7dc",
      accent: "#496b4e",
      accentSoft: "#d9e6d8",
      accentInk: "#ffffff",
      success: "#347250",
      successSoft: "#dcebe1",
      danger: "#9d413b",
      dangerSoft: "#f1ddda",
      emphasis: "#202a21",
      emphasisInk: "#f8fbf6",
    },
  },
  {
    key: "saffron",
    label: "زعفران",
    description: "روشن و خوش‌انرژی با گرمای طلایی ملایم",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f6efdf",
      ink: "#271e13",
      inkStrong: "#171008",
      inkMuted: "#706555",
      line: "#ddd0b9",
      surface: "#eadfc9",
      canvas: "#ece3d1",
      panel: "#fcf8ef",
      control: "#f2e9d8",
      controlHover: "#e9ddc7",
      accent: "#8e5a14",
      accentSoft: "#f1dfbd",
      accentInk: "#fffaf1",
      success: "#39704f",
      successSoft: "#dce9df",
      danger: "#9d4035",
      dangerSoft: "#f3ddd7",
      emphasis: "#302419",
      emphasisInk: "#fffaf1",
    },
  },
  {
    key: "pomegranate",
    label: "انار",
    description: "ظریف و متمایز با رنگی عمیق و مهمان‌نواز",
    palette: {
      mode: "light",
      contrast: "standard",
      paper: "#f4eeee",
      ink: "#2a1b1f",
      inkStrong: "#180e11",
      inkMuted: "#716064",
      line: "#d9c8cc",
      surface: "#e8dcde",
      canvas: "#ebe2e3",
      panel: "#fbf7f6",
      control: "#f1e8e9",
      controlHover: "#e7dadd",
      accent: "#873c51",
      accentSoft: "#efd7dd",
      accentInk: "#fff8fa",
      success: "#347052",
      successSoft: "#dce9e1",
      danger: "#a03838",
      dangerSoft: "#f2dada",
      emphasis: "#321f25",
      emphasisInk: "#fff8fa",
    },
  },
  {
    key: "high-contrast",
    label: "کنتراست روشن",
    description: "مرزبندی واضح و خوانایی بیشتر برای استفاده روزمره",
    palette: {
      mode: "light",
      contrast: "high",
      paper: "#fbfaf6",
      ink: "#111111",
      inkStrong: "#000000",
      inkMuted: "#44423e",
      line: "#817d74",
      surface: "#e7e4dc",
      canvas: "#eceae4",
      panel: "#ffffff",
      control: "#f2f0e9",
      controlHover: "#e5e2da",
      accent: "#8f260a",
      accentSoft: "#f6d5ca",
      accentInk: "#ffffff",
      success: "#14633e",
      successSoft: "#d4eadc",
      danger: "#9b211d",
      dangerSoft: "#f3d5d2",
      emphasis: "#171717",
      emphasisInk: "#ffffff",
    },
  },
  {
    key: "high-contrast-dark",
    label: "کنتراست تیره",
    description: "تیره، پرقدرت و مناسب خوانایی در نور کم",
    palette: {
      mode: "dark",
      contrast: "high",
      paper: "#111212",
      ink: "#f4f3ef",
      inkStrong: "#ffffff",
      inkMuted: "#c9c7c0",
      line: "#666a68",
      surface: "#202222",
      canvas: "#090a0a",
      panel: "#1a1b1b",
      control: "#252727",
      controlHover: "#303333",
      accent: "#ff9b75",
      accentSoft: "#4b2b22",
      accentInk: "#241008",
      success: "#7cdaa8",
      successSoft: "#193d2b",
      danger: "#ff9a91",
      dangerSoft: "#4b2423",
      emphasis: "#252827",
      emphasisInk: "#ffffff",
    },
  },
  {
    key: "midnight",
    label: "نیمه‌شب",
    description: "تیره و آرام با حال‌وهوای آبی برای شب‌های طولانی",
    palette: {
      mode: "dark",
      contrast: "standard",
      paper: "#111722",
      ink: "#f0f4f8",
      inkStrong: "#ffffff",
      inkMuted: "#a9b4c3",
      line: "#3d4c60",
      surface: "#1d2837",
      canvas: "#0b1018",
      panel: "#18212e",
      control: "#222e3e",
      controlHover: "#2b394b",
      accent: "#78b7ff",
      accentSoft: "#213d5c",
      accentInk: "#07121f",
      success: "#74d8a1",
      successSoft: "#183b2b",
      danger: "#ff9b98",
      dangerSoft: "#482527",
      emphasis: "#202c3c",
      emphasisInk: "#f7faff",
    },
  },
  {
    key: "espresso",
    label: "اسپرسو",
    description: "تیره و گرم با رنگ‌های قهوه‌ای و مسی",
    palette: {
      mode: "dark",
      contrast: "standard",
      paper: "#1b1613",
      ink: "#f5eee7",
      inkStrong: "#fffaf3",
      inkMuted: "#c3b4a8",
      line: "#59483d",
      surface: "#2b231e",
      canvas: "#120e0c",
      panel: "#251e1a",
      control: "#312720",
      controlHover: "#3b2f27",
      accent: "#eaa06e",
      accentSoft: "#573424",
      accentInk: "#211108",
      success: "#8ed2a9",
      successSoft: "#213b2d",
      danger: "#f39a91",
      dangerSoft: "#4a2825",
      emphasis: "#332820",
      emphasisInk: "#fff7f0",
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

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function contrastingThemeText(background: string, palette: ThemePalette): string {
  return contrastRatio(background, palette.inkStrong) >=
    contrastRatio(background, palette.paper)
    ? palette.inkStrong
    : palette.paper;
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
    accentInk: contrastingThemeText(accent, palette),
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
    "--control": palette.control,
    "--control-hover": palette.controlHover,
    "--accent": palette.accent,
    "--accent-soft": palette.accentSoft,
    "--accent-ink": palette.accentInk,
    "--success": palette.success,
    "--success-soft": palette.successSoft,
    "--danger": palette.danger,
    "--danger-soft": palette.dangerSoft,
    "--emphasis": palette.emphasis,
    "--emphasis-ink": palette.emphasisInk,
  };
}
