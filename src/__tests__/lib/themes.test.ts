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

    expect(theme.paper).toBe("#f6efdf");
    expect(theme.accent).toBe("#8e5a14");
    expect(variables["--canvas"]).toBe("#ece3d1");
    expect(variables["--panel"]).toBe("#fcf8ef");
    expect(variables["--control"]).toBe("#f2e9d8");
    expect(variables["--accent-ink"]).toBe("#fffaf1");
  });

  it("exposes high-contrast and dark presets", () => {
    const highContrast = resolveVenueTheme("high-contrast");
    const dark = resolveVenueTheme("midnight");

    expect(highContrast.contrast).toBe("high");
    expect(highContrast.mode).toBe("light");
    expect(dark.mode).toBe("dark");
    expect(dark.paper).toBe("#111722");
    expect(dark.panel).toBe("#18212e");
    expect(dark.control).toBe("#222e3e");
  });

  it("supports valid legacy accent colors without accepting CSS injection", () => {
    const darkAccent = resolveVenueTheme("classic", "#123456");
    const lightAccent = resolveVenueTheme("midnight", "#fefefe");

    expect(darkAccent.accent).toBe("#123456");
    expect(darkAccent.accentInk).toBe("#f4efe6");
    expect(lightAccent.accentInk).toBe("#111722");
    expect(resolveVenueTheme("classic", "red; color: transparent").accent).toBe(
      "#a8462a"
    );
  });
});
