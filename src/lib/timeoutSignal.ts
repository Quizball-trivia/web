/**
 * AbortSignal.timeout for every browser we serve: Safari < 16 (iOS 15) and Chrome < 103 lack it,
 * and calling it there throws before the request is sent.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException("The operation timed out.", "TimeoutError")), ms);
  return controller.signal;
}
