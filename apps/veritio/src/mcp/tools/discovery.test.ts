import { describe, expect, it } from "vitest";
import { TOOLS } from "../registry";

describe("fetch resource input", () => {
  it("accepts an organization id for multi-workspace capability discovery", () => {
    const fetchResource = TOOLS.find((tool) => tool.name === "fetch");
    expect(fetchResource).toBeDefined();
    const schema = fetchResource!.inputSchema as unknown as {
      safeParse(value: unknown): { success: boolean };
    };
    const parsed = schema.safeParse({
      id: "self",
      organization_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.success).toBe(true);
  });
});
