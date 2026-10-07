import { createPartnerApiClient, type PartnerApiClient, type PartnerApiError, type PartnerTransport } from "./api/partnerApiClient";
import type { RedeemResponse } from "./api/partnerApi.types";

export interface PartnerSessionCore {
  api: PartnerApiClient;
  /** Stores the access token in memory and returns its expiry (epoch ms); null once the session has ended. */
  accept(session: RedeemResponse): number | null;
  /** Terminal: drops the token and refuses every later accept. */
  end(): void;
  hasToken(): boolean;
  expiresAt(): number;
  setSessionEndedListener(listener: (error: PartnerApiError) => void): void;
}

const FALLBACK_LIFETIME_MS = 2 * 60_000;

/** The partner access token lives only in this closure: never in storage, cookies, the URL or React state. */
export function createPartnerSessionCore(transport: PartnerTransport): PartnerSessionCore {
  let accessToken: string | null = null;
  let expiresAt = 0;
  let ended = false;
  let sessionEnded: (error: PartnerApiError) => void = () => {};

  const api = createPartnerApiClient({
    transport,
    getAccessToken: () => accessToken,
    onSessionEnded: (error) => sessionEnded(error),
  });

  return {
    api,
    accept(session) {
      if (ended) return null;
      accessToken = session.accessToken;
      const parsed = Date.parse(session.accessTokenExpiresAt);
      expiresAt = Number.isFinite(parsed) ? parsed : Date.now() + FALLBACK_LIFETIME_MS;
      return expiresAt;
    },
    end() {
      ended = true;
      accessToken = null;
      expiresAt = 0;
    },
    hasToken: () => accessToken !== null,
    expiresAt: () => expiresAt,
    setSessionEndedListener(listener) {
      sessionEnded = listener;
    },
  };
}
