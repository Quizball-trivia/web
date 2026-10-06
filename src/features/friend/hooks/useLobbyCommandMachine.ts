import { useCallback, useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "@/lib/realtime/socket-client";
import type {
  DuelGameId,
  RoomGameId,
  LobbyCreateResult,
  LobbyJoinByCodeResult,
  LobbyLeaveResult,
  MatchMode,
} from "@/lib/realtime/socket.types";
import { extractFriendInviteCode } from "@/lib/friend/inviteCode";
import { logger } from "@/utils/logger";

type LobbyCommandOperation = "create" | "join" | "leave";

/** A room opened straight in a friend-playable mode; a duel names its game. */
export type LobbyCreatePayload =
  | { mode: MatchMode; isPublic?: boolean; gameMode?: "football_grid" | "auction"; duelGame?: undefined }
  | { mode: "friendly"; isPublic?: boolean; gameMode: "duel"; duelGame: DuelGameId }
  | { mode: "friendly"; isPublic?: boolean; gameMode: "room_game"; roomGame: RoomGameId; duelGame?: undefined };
type LobbyCommandStatus = "idle" | "creating" | "joining" | "leaving" | "success" | "failed";

export interface LobbyCommandError {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
  correlationId: string;
}

export type LobbyCommandOutcome =
  | LobbyCreateResult
  | LobbyJoinByCodeResult
  | LobbyLeaveResult
  | LobbyCommandError;

interface LobbyCommandState {
  status: LobbyCommandStatus;
  operation: LobbyCommandOperation | null;
  commandKey: string | null;
  correlationId: string | null;
  targetInviteCode: string | null;
  error: LobbyCommandError | null;
}

interface ExecuteOptions<T extends LobbyCommandOutcome> {
  operation: LobbyCommandOperation;
  commandKey: string;
  targetInviteCode?: string | null;
  maxRetries?: number;
  send: (correlationId: string) => Promise<T | LobbyCommandError>;
}

const COMMAND_ACK_TIMEOUT_MS = 10_000;
const INITIAL_STATE: LobbyCommandState = {
  status: "idle",
  operation: null,
  commandKey: null,
  correlationId: null,
  targetInviteCode: null,
  error: null,
};

function operationStatus(operation: LobbyCommandOperation): LobbyCommandStatus {
  if (operation === "create") return "creating";
  if (operation === "join") return "joining";
  return "leaving";
}

function createCorrelationId(operation: LobbyCommandOperation): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `lobby_${operation}_${randomId}`;
}

function isActiveOrComplete(state: LobbyCommandState): boolean {
  return (
    state.status === "creating" ||
    state.status === "joining" ||
    state.status === "leaving" ||
    state.status === "success"
  );
}

export function useLobbyCommandMachine() {
  const [state, setState] = useState<LobbyCommandState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const sequenceRef = useRef(0);
  const mountedRef = useRef(true);
  // Backoff waits, with their resolvers: cancelling one settles it (never a forever-pending command).
  const waitsRef = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());

  const setMachineState = useCallback((nextState: LobbyCommandState) => {
    stateRef.current = nextState;
    if (mountedRef.current) {
      setState(nextState);
    }
  }, []);

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        waitsRef.current.delete(timer);
        resolve();
      }, ms);
      waitsRef.current.set(timer, resolve);
    });
  }, []);

  useEffect(() => {
    // StrictMode replays mount → unmount → mount: the replayed mount must be live again.
    mountedRef.current = true;
    const waits = waitsRef.current;
    return () => {
      mountedRef.current = false;
      // Backoff waits are cut short and settled (the loop then sees it is unmounted and stops). A command's ACK
      // deadline keeps running so its promise always settles (a cleared deadline with a lost ACK would hang forever).
      waits.forEach((resolve, timer) => {
        clearTimeout(timer);
        resolve();
      });
      waits.clear();
    };
  }, []);

  const emitWithAck = useCallback(<T extends LobbyCommandOutcome>(
    emit: (correlationId: string, ack: (result: T) => void) => void,
    correlationId: string
  ): Promise<T | LobbyCommandError> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          ok: false,
          code: "LOBBY_ACK_TIMEOUT",
          message: "Lobby command timed out. Please try again.",
          retryable: false,
          correlationId,
        });
      }, COMMAND_ACK_TIMEOUT_MS);

      try {
        connectSocket();
        emit(correlationId, (result) => {
          clearTimeout(timeout);
          resolve(result);
        });
      } catch (error) {
        clearTimeout(timeout);
        logger.error("Lobby command emit failed", { error, correlationId });
        resolve({
          ok: false,
          code: "LOBBY_EMIT_ERROR",
          message: "Could not send lobby command. Please try again.",
          retryable: false,
          correlationId,
        });
      }
    });
  }, []);

  const execute = useCallback(async <T extends LobbyCommandOutcome>({
    operation,
    commandKey,
    targetInviteCode = null,
    maxRetries = 4,
    send,
  }: ExecuteOptions<T>): Promise<T | LobbyCommandError | null> => {
    const current = stateRef.current;
    if (current.commandKey === commandKey && isActiveOrComplete(current)) {
      logger.info("Lobby command skipped because it is already active", {
        operation,
        commandKey,
        correlationId: current.correlationId,
      });
      return null;
    }

    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    const correlationId = createCorrelationId(operation);

    setMachineState({
      status: operationStatus(operation),
      operation,
      commandKey,
      correlationId,
      targetInviteCode,
      error: null,
    });

    // A reset (another code, leaving, an identity switch) or unmount ends this command: nothing is sent or applied after.
    const superseded = () => sequenceRef.current !== sequence || !mountedRef.current;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (superseded()) return null;
      const result = await send(correlationId);
      if (superseded()) return null;

      logger.info("Lobby command ack received", {
        operation,
        commandKey,
        correlationId,
        ok: result.ok,
        code: result.ok ? null : result.code,
        retryable: result.ok ? false : result.retryable,
        attempt,
      });

      if (result.ok) {
        setMachineState({
          status: "success",
          operation,
          commandKey,
          correlationId,
          targetInviteCode,
          error: null,
        });
        return result;
      }

      if (result.retryable && attempt < maxRetries) {
        await wait(220 + attempt * 140);
        if (superseded()) return null;
        continue;
      }

      setMachineState({
        status: "failed",
        operation,
        commandKey,
        correlationId,
        targetInviteCode,
        error: result,
      });
      return result;
    }

    return null;
  }, [setMachineState, wait]);

  const createLobby = useCallback((payload: LobbyCreatePayload) => {
    const commandKey = `create:${payload.mode}:${payload.isPublic === true ? "public" : "private"}${payload.gameMode ? `:${payload.gameMode}` : ""}${payload.duelGame ? `:${payload.duelGame}` : ""}${payload.gameMode === "room_game" ? `:${payload.roomGame}` : ""}`;
    return execute<LobbyCreateResult>({
      operation: "create",
      commandKey,
      maxRetries: 2,
      send: (correlationId) =>
        emitWithAck<LobbyCreateResult>(
          (id, ack) => {
            getSocket().emit("lobby:create", { ...payload, correlationId: id }, ack);
          },
          correlationId
        ),
    });
  }, [emitWithAck, execute]);

  const joinByCode = useCallback((inviteCode: string) => {
    const targetInviteCode = extractFriendInviteCode(inviteCode);
    if (!targetInviteCode) {
      const correlationId = createCorrelationId("join");
      const error: LobbyCommandError = {
        ok: false,
        code: "INVALID_INVITE_CODE",
        message: "Please enter a valid lobby code or invite link.",
        retryable: false,
        correlationId,
      };
      setMachineState({
        status: "failed",
        operation: "join",
        commandKey: "join:invalid",
        correlationId,
        targetInviteCode: null,
        error,
      });
      return Promise.resolve(error);
    }

    return execute<LobbyJoinByCodeResult>({
      operation: "join",
      commandKey: `join:${targetInviteCode}`,
      targetInviteCode,
      maxRetries: 5,
      send: (correlationId) =>
        emitWithAck<LobbyJoinByCodeResult>(
          (id, ack) => {
            getSocket().emit("lobby:join_by_code", { inviteCode: targetInviteCode, correlationId: id }, ack);
          },
          correlationId
        ),
    });
  }, [emitWithAck, execute, setMachineState]);

  const leaveLobby = useCallback(() => {
    return execute<LobbyLeaveResult>({
      operation: "leave",
      commandKey: "leave",
      maxRetries: 3,
      send: (correlationId) =>
        emitWithAck<LobbyLeaveResult>(
          (id, ack) => {
            getSocket().emit("lobby:leave", { correlationId: id }, ack);
          },
          correlationId
        ),
    });
  }, [emitWithAck, execute]);

  const reset = useCallback(() => {
    sequenceRef.current += 1;
    setMachineState(INITIAL_STATE);
  }, [setMachineState]);

  return {
    state,
    isCreating: state.status === "creating",
    isJoining: state.status === "joining",
    isLeaving: state.status === "leaving",
    isBusy: state.status === "creating" || state.status === "joining" || state.status === "leaving",
    createLobby,
    joinByCode,
    leaveLobby,
    reset,
  };
}
