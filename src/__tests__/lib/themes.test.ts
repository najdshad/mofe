import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PRESET,
  isThemePresetKey,
  normalizeThemePreset,
  resolveVenueTheme,
  themeStyleVariables,
} from "@/lib/themes";

describe("themes", () => {
  it("normalizes unknown preset values to the default", () => {
    expect(normalizeThemePreset("olive")).toBe("olive");
    expect(normalizeThemePreset("unknown")).toBe(DEFAULT_THEME_PRESET);
    expect(normalizeThemePreset(null)).toBe(DEFAULT_THEME_PRESET);
  });

  it("validates only known preset keys", () => {
    expect(isThemePresetKey("pomegranate")).toBe(true);
    expect(isThemePresetKey("neon")).toBe(false);
  });

  it("resolves every surface token from a preset", () => {
    const theme = resolveVenueTheme("saffron");
    const variables = themeStyleVariables(theme);

    expect(theme.paper).toBe("#f7f0df");
    expect(theme.accent).toBe("#a96818");
    expect(variables["--canvas"]).toBe("#eee6d5");
    expect(variables["--panel"]).toBe("#fdfaf2");
  });

  it("exposes high-contrast and dark presets", () => {
    const highContrast = resolveVenueTheme("high-contrast");
    const dark = resolveVenueTheme("midnight");

    expect(highContrast.contrast).toBe("high");
    expect(highContrast.mode).toBe("light");
    expect(dark.mode).toBe("dark");
    expect(dark.paper).toBe("#121722");
    expect(dark.panel).toBe("#1a2130");
  });

  it("supports valid legacy accent colors without accepting CSS injection", () => {
    expect(resolveVenueTheme("classic", "#123456").accent).toBe("#123456");
    expect(resolveVenueTheme("classic", "red; color: transparent").accent).toBe(
      "#b94f2c"
    );
  });
});
