import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthToken,
  isSessionActuallyExpired,
} from "../../../../../packages/@veritio/auth/src/client";

describe("session expiration confirmation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAuthToken();
  });

  it("does not expire a valid session because an unrelated endpoint returned 401", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: { token: "still-valid" },
        user: { id: "user-1" },
      },
      error: null,
    } as never);

    await expect(isSessionActuallyExpired(getSession as never)).resolves.toBe(
      false,
    );
  });

  it("expires only when Better Auth confirms there is no session", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(isSessionActuallyExpired(getSession as never)).resolves.toBe(
      true,
    );
  });

  it("keeps the user in place when session validation itself fails", async () => {
    const getSession = vi
      .fn()
      .mockRejectedValue(new Error("network unavailable"));

    await expect(isSessionActuallyExpired(getSession as never)).resolves.toBe(
      false,
    );
  });
});
