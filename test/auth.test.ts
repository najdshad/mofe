import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  generateIdentifier,
  hashIdentifier,
  hashSha256,
  parseCookies,
  secretMatches,
  signSession,
  verifySession,
} from "../src/auth";

const secret = "a-very-long-test-session-secret-0123456789";
const userId = 7;
const sessionVersion = 3;

describe("sessions", () => {
  it("signs and verifies a session round trip", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(
      expiresAt,
      userId,
      sessionVersion,
      secret,
    );

    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    await expect(
      verifySession(
        `${expiresAt}.${userId}.${sessionVersion}.${signature}`,
        secret,
        now,
      ),
    ).resolves.toEqual({ userId, sessionVersion });
  });

  it("rejects a tampered signature", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(
      expiresAt,
      userId,
      sessionVersion,
      secret,
    );
    const tampered =
      signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");

    await expect(
      verifySession(
        `${expiresAt}.${userId}.${sessionVersion}.${tampered}`,
        secret,
        now,
      ),
    ).resolves.toBeNull();
  });

  it("rejects a session signed with another secret", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(
      expiresAt,
      userId,
      sessionVersion,
      `${secret}-other`,
    );

    await expect(
      verifySession(
        `${expiresAt}.${userId}.${sessionVersion}.${signature}`,
        secret,
        now,
      ),
    ).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now - 1;
    const signature = await signSession(
      expiresAt,
      userId,
      sessionVersion,
      secret,
    );

    await expect(
      verifySession(
        `${expiresAt}.${userId}.${sessionVersion}.${signature}`,
        secret,
        now,
      ),
    ).resolves.toBeNull();
  });

  it("rejects malformed values and missing secrets", async () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60_000;
    const signature = await signSession(
      expiresAt,
      userId,
      sessionVersion,
      secret,
    );
    const value = `${expiresAt}.${userId}.${sessionVersion}.${signature}`;

    for (const malformed of [
      null,
      undefined,
      "",
      "nope",
      `${expiresAt}`,
      `${expiresAt}.${userId}`,
      `${expiresAt}.${userId}.${sessionVersion}`,
      `${expiresAt}.${signature}`,
      `.${userId}.${sessionVersion}.${signature}`,
      `${value}.extra`,
      `abc.${userId}.${sessionVersion}.${signature}`,
      `${expiresAt}.0.${sessionVersion}.${signature}`,
      `${expiresAt}.${userId}.-1.${signature}`,
      `${expiresAt}.${userId}.${sessionVersion}.${signature.slice(0, -2)}`,
    ]) {
      await expect(verifySession(malformed, secret, now)).resolves.toBeNull();
    }
    await expect(verifySession(value, undefined, now)).resolves.toBeNull();
    await expect(verifySession(value, "", now)).resolves.toBeNull();
  });

  it("refuses to sign invalid sessions", async () => {
    const now = 1_700_000_000_000;
    await expect(
      signSession(now + 60_000, 0, 0, secret),
    ).rejects.toThrow();
    await expect(
      signSession(now + 60_000, userId, -1, secret),
    ).rejects.toThrow();
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

describe("secretMatches", () => {
  it("accepts the correct secret and rejects others", async () => {
    await expect(
      secretMatches("correct horse", "correct horse"),
    ).resolves.toBe(true);
    await expect(secretMatches("wrong", "correct horse")).resolves.toBe(false);
  });

  it("fails closed when no secret is configured", async () => {
    await expect(secretMatches("anything", "")).resolves.toBe(false);
  });
});

describe("identifiers", () => {
  it("generates unique prefixed tokens", () => {
    const first = generateIdentifier();
    const second = generateIdentifier();
    expect(first).toMatch(/^mofe_[0-9a-f]{32}$/);
    expect(second).not.toBe(first);
  });

  it("hashes identifiers with SHA-256", async () => {
    expect(await hashIdentifier("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const digest = await hashSha256("abc");
    expect(digest).toHaveLength(32);
  });
});

describe("parseCookies", () => {
  it("parses multiple cookies and ignores malformed parts", () => {
    expect(
      parseCookies("mofe_session=123.abc; theme=dark; broken; empty="),
    ).toEqual({ mofe_session: "123.abc", theme: "dark", empty: "" });
    expect(parseCookies(null)).toEqual({});
  });

  it("keeps the first duplicate cookie", () => {
    expect(parseCookies("a=1; a=2")).toEqual({ a: "1" });
  });
});
