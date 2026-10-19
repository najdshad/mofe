import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  hashSha256,
  parseCookies,
  passwordMatches,
  signSession,
  verifySession,
} from "../src/auth";

const secret = "a-very-long-test-session-secret-0123456789";

describe("sessions", () => {
  it("signs and verifies a session round trip", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(expiresAt, secret);

    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    await expect(
      verifySession(`${expiresAt}.${signature}`, secret, now),
    ).resolves.toBe(true);
  });

  it("rejects a tampered signature", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(expiresAt, secret);
    const tampered =
      signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");

    await expect(
      verifySession(`${expiresAt}.${tampered}`, secret, now),
    ).resolves.toBe(false);
  });

  it("rejects a session signed with another secret", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(expiresAt, `${secret}-other`);

    await expect(
      verifySession(`${expiresAt}.${signature}`, secret, now),
    ).resolves.toBe(false);
  });

  it("rejects an expired session", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now - 1;
    const signature = await signSession(expiresAt, secret);

    await expect(
      verifySession(`${expiresAt}.${signature}`, secret, now),
    ).resolves.toBe(false);
  });

  it("rejects malformed values and missing secrets", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(expiresAt, secret);

    for (const value of [
      null,
      undefined,
      "",
      "nope",
      `${expiresAt}`,
      `${expiresAt}.`,
      `.${signature}`,
      `${expiresAt}.${signature}.extra`,
      `${expiresAt}.${signature.slice(0, -2)}`,
      `abc.${signature}`,
    ]) {
      await expect(verifySession(value, secret, now)).resolves.toBe(false);
    }
    await expect(
      verifySession(`${expiresAt}.${signature}`, undefined, now),
    ).resolves.toBe(false);
    await expect(
      verifySession(`${expiresAt}.${signature}`, "", now),
    ).resolves.toBe(false);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for equal values", () => {
    expect(constantTimeEqual("same-value", "same-value")).toBe(true);
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
    ).toBe(true);
  });

  it("returns false for different values or lengths", () => {
    expect(constantTimeEqual("same-value", "same-valuf")).toBe(false);
    expect(constantTimeEqual("short", "longer")).toBe(false);
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])),
    ).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("accepts the correct password and rejects others", async () => {
    await expect(passwordMatches("correct horse", "correct horse")).resolves.toBe(
      true,
    );
    await expect(passwordMatches("wrong", "correct horse")).resolves.toBe(
      false,
    );
  });

  it("fails closed when no password is configured", async () => {
    await expect(passwordMatches("anything", "")).resolves.toBe(false);
  });

  it("hashes with SHA-256", async () => {
    const digest = await hashSha256("abc");
    expect(digest).toHaveLength(32);
    expect(BufferLikeHex(digest)).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("parseCookies", () => {
  it("parses multiple cookies and ignores malformed parts", () => {
    expect(
      parseCookies("mofe_admin=123.abc; theme=dark; broken; empty="),
    ).toEqual({ mofe_admin: "123.abc", theme: "dark", empty: "" });
    expect(parseCookies(null)).toEqual({});
  });

  it("keeps the first duplicate cookie", () => {
    expect(parseCookies("a=1; a=2")).toEqual({ a: "1" });
  });
});

function BufferLikeHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
