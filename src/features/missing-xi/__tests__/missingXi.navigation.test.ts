import { describe, expect, it } from "vitest";
import { nextOpenSlotId, pitchOrder, slotInDirection } from "../missingXi.navigation";

// 4-3-3 shape: GK bottom, back four, midfield three, front three.
const slots = [
  { id: "gk", x: 50, y: 90 },
  { id: "rb", x: 86, y: 72 },
  { id: "rcb", x: 62, y: 72 },
  { id: "lcb", x: 38, y: 72 },
  { id: "lb", x: 14, y: 72 },
  { id: "rcm", x: 78, y: 48 },
  { id: "cm", x: 50, y: 48 },
  { id: "lcm", x: 22, y: 48 },
  { id: "rw", x: 78, y: 22 },
  { id: "cf", x: 50, y: 22 },
  { id: "lw", x: 22, y: 22 },
];
const all = () => true;

describe("Missing XI keyboard navigation", () => {
  it("reads the pitch goalkeeper first, then back to front, left to right", () => {
    expect(pitchOrder(slots).map((slot) => slot.id)).toEqual(["gk", "lb", "lcb", "rcb", "rb", "lcm", "cm", "rcm", "lw", "cf", "rw"]);
  });

  it("moves to the next open shirt, skipping named ones and wrapping", () => {
    const named = new Set(["lcb", "rcb"]);
    const open = (slot: { id: string }) => !named.has(slot.id);
    expect(nextOpenSlotId(slots, open, "lb")).toBe("rb");
    expect(nextOpenSlotId(slots, open, "rw")).toBe("gk");
    expect(nextOpenSlotId(slots, open, "rb", -1)).toBe("lb");
    expect(nextOpenSlotId(slots, open, null)).toBe("gk");
    expect(nextOpenSlotId(slots, open, null, -1)).toBe("rw");
  });

  it("returns null when every other shirt is named", () => {
    expect(nextOpenSlotId(slots, (slot) => slot.id === "cf", "cf")).toBeNull();
  });

  it("follows arrow keys across the pitch", () => {
    expect(slotInDirection(slots, all, "cm", "up")).toBe("cf");
    expect(slotInDirection(slots, all, "lcm", "down")).toBe("lb");
    expect(slotInDirection(slots, all, "lb", "down")).toBe("gk");
    expect(slotInDirection(slots, all, "cm", "left")).toBe("lcm");
    expect(slotInDirection(slots, all, "lb", "left")).toBeNull();
    expect(slotInDirection(slots, (slot) => slot.id !== "lw", "lcm", "up")).toBe("cf");
  });
});
