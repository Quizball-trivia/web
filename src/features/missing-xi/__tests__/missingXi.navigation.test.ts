import { describe, expect, it } from "vitest";
import { nextOpenSlotId, pitchLines, pitchOrder, slotInDirection } from "../missingXi.navigation";

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

  it("never wraps when asked not to (arrow keys)", () => {
    expect(nextOpenSlotId(slots, all, "rw", 1, false)).toBeNull();
    expect(nextOpenSlotId(slots, all, "gk", -1, false)).toBeNull();
    expect(nextOpenSlotId(slots, all, "lb", 1, false)).toBe("lcb");
  });

  it("follows arrow keys across the pitch", () => {
    expect(slotInDirection(slots, all, "cm", "up")).toBe("cf");
    expect(slotInDirection(slots, all, "lcm", "down")).toBe("lb");
    expect(slotInDirection(slots, all, "lb", "down")).toBe("gk");
    expect(slotInDirection(slots, all, "cm", "left")).toBe("lcm");
    expect(slotInDirection(slots, all, "lb", "left")).toBeNull();
    expect(slotInDirection(slots, (slot) => slot.id !== "lw", "lcm", "up")).toBe("cf");
  });

  // Barcelona 2011 as the demo draws it: curved lines (full-backs ahead of the centre-backs, wingers behind Messi).
  const curved = [
    { id: "gk", x: 50, y: 88 },
    { id: "rb", x: 84, y: 68 }, { id: "rcb", x: 62, y: 72 }, { id: "lcb", x: 38, y: 72 }, { id: "lb", x: 16, y: 68 },
    { id: "dm", x: 50, y: 54 },
    { id: "rcm", x: 68, y: 44 }, { id: "lcm", x: 32, y: 44 },
    { id: "rw", x: 80, y: 24 }, { id: "cf", x: 50, y: 18 }, { id: "lw", x: 20, y: 24 },
  ];

  it("groups curved formation lines and reads each left to right", () => {
    expect(pitchLines(curved).map((line) => line.map((slot) => slot.id))).toEqual([["gk"], ["lb", "lcb", "rcb", "rb"], ["dm"], ["lcm", "rcm"], ["lw", "cf", "rw"]]);
    expect(nextOpenSlotId(curved, all, "gk")).toBe("lb");
  });

  it("keeps left/right on the formation line and stops at its edge", () => {
    expect(slotInDirection(curved, all, "lcm", "left")).toBeNull();
    expect(slotInDirection(curved, all, "lcm", "right")).toBe("rcm");
    expect(slotInDirection(curved, all, "lb", "right")).toBe("lcb");
    expect(slotInDirection(curved, all, "rb", "right")).toBeNull();
    expect(slotInDirection(curved, all, "lw", "right")).toBe("cf");
  });

  it("moves up and down one line at a time without wrapping", () => {
    expect(slotInDirection(curved, all, "rw", "up")).toBeNull();
    expect(slotInDirection(curved, all, "gk", "down")).toBeNull();
    expect(slotInDirection(curved, all, "lb", "up")).toBe("dm");
    expect(slotInDirection(curved, all, "dm", "up")).toBe("lcm");
    expect(slotInDirection(curved, (slot) => slot.id !== "dm", "lcb", "up")).toBe("lcm");
    expect(slotInDirection(curved, all, "rcm", "up")).toBe("rw");
  });
});
