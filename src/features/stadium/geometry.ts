/**
 * Stage geometry for the Figma stadium (frame 755×510), in percent of the
 * stage box. Measured from the design export; the stage keeps the frame's
 * aspect ratio so percentages map to the same shapes at any size.
 */

export const STAGE_ASPECT = 755 / 510;

export type Box = { left: number; top: number; width: number; height: number };

/** Outer bowl, rounded rectangle. `radius` is percent of stage width. */
export const BOWL = {
  left: 1.3,
  top: 1.5,
  width: 97.4,
  height: 97,
  radius: 13,
} as const;
/** Bright rim around the bowl, percent of stage width. */
export const RIM_WIDTH = 1.85;

/** Black perimeter between stands and turf. */
export const TRACK = {
  left: 11.7,
  top: 15.7,
  width: 75.8,
  height: 66.7,
  radius: 5,
} as const;

/** Turf. */
export const PITCH: Box = { left: 15.2, top: 23.5, width: 68.2, height: 50.9 };

/** Ad boards sit on the track: orange strips above/below the turf, black boards beside it. */
export const BOARDS = {
  top: {
    left: PITCH.left,
    top: TRACK.top,
    width: PITCH.width,
    height: PITCH.top - TRACK.top,
  },
  bottom: {
    left: PITCH.left,
    top: PITCH.top + PITCH.height,
    width: PITCH.width,
    height: TRACK.top + TRACK.height - (PITCH.top + PITCH.height),
  },
  left: {
    left: TRACK.left,
    top: PITCH.top,
    width: PITCH.left - TRACK.left,
    height: PITCH.height,
  },
  right: {
    left: PITCH.left + PITCH.width,
    top: PITCH.top,
    width: TRACK.left + TRACK.width - (PITCH.left + PITCH.width),
    height: PITCH.height,
  },
} as const satisfies Record<string, Box>;

/** Green walkways that split the stands into sections. Percent of stage width. */
export const AISLE_WIDTH = 1.3;
/** Vertical aisles through the north and south stands, percent of stage width. */
export const END_AISLES_X = [36, 50, 64] as const;
/** Horizontal aisle through the side stands, percent of stage height. */
export const SIDE_AISLE_Y = 50;
/** Radial aisles in each corner, degrees from the corner's diagonal. */
export const CORNER_AISLE_ANGLES = [-22, 22] as const;

/** Fan dot lattice pitch: columns in percent of width, rows in percent of height. */
export const DOT_PITCH = { x: 0.8, y: 1.0 } as const;
/** Dot radius, percent of stage width. */
export const DOT_RADIUS = 0.27;

/** Percent box re-expressed relative to a parent box, for children of a positioned container. */
export function boxWithin(box: Box, parent: Box): Box {
  return {
    left: ((box.left - parent.left) / parent.width) * 100,
    top: ((box.top - parent.top) / parent.height) * 100,
    width: (box.width / parent.width) * 100,
    height: (box.height / parent.height) * 100,
  };
}

export function boxStyle(box: Box) {
  return {
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  } as const;
}

/** Signed distance from a point to a rounded rectangle (negative inside). Units follow the inputs. */
export function roundedRectDistance(
  px: number,
  py: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): number {
  const cx = left + width / 2;
  const cy = top + height / 2;
  const hx = width / 2 - radius;
  const hy = height / 2 - radius;
  const dx = Math.abs(px - cx) - hx;
  const dy = Math.abs(py - cy) - hy;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - radius;
}
