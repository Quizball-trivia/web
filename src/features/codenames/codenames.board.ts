import type { BoardKind } from "./codenames.view";

const BOARD_KEY = "qb.codenames.board";
const ROOM_KEY = "qb.codenames.roomBoard";
/** A hand-off older than this is from another visit, not the room being opened now. */
const ROOM_PRESET_MS = 10 * 60_000;

/** The board the viewer picked last on the Codenames screen (storage may be unavailable: then Pictures). */
export function readBoard(): BoardKind {
  try {
    return window.localStorage.getItem(BOARD_KEY) === "words" ? "words" : "pictures";
  } catch {
    return "pictures";
  }
}

export function writeBoard(board: BoardKind): void {
  try {
    window.localStorage.setItem(BOARD_KEY, board);
  } catch {
    // Storage blocked: the choice is just not remembered.
  }
}

/** "Play with friends" with Words picked: the next room this tab opens presets Words once. */
export function setRoomPreset(board: BoardKind): void {
  try {
    if (board === "words") window.sessionStorage.setItem(ROOM_KEY, String(Date.now()));
    else window.sessionStorage.removeItem(ROOM_KEY);
  } catch {
    // Storage blocked: the host picks Words in the room instead.
  }
}

/** True once when a fresh Words hand-off is waiting (it is cleared either way). */
export function takeRoomPreset(): boolean {
  try {
    const at = Number(window.sessionStorage.getItem(ROOM_KEY));
    window.sessionStorage.removeItem(ROOM_KEY);
    return Number.isFinite(at) && at > 0 && Date.now() - at < ROOM_PRESET_MS;
  } catch {
    return false;
  }
}
