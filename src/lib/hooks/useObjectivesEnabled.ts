// Objectives visibility is driven by the NEXT_PUBLIC_OBJECTIVES_ENABLED env var
// (set per-environment in Vercel), NOT a PostHog feature flag — PostHog flag
// loading is disabled to cut flag-request volume. "false" hides Objectives;
// anything else (incl. unset) shows them.
const envOverride = process.env.NEXT_PUBLIC_OBJECTIVES_ENABLED;

/**
 * Reports whether the Objectives feature is enabled. Env-driven (Vercel):
 * NEXT_PUBLIC_OBJECTIVES_ENABLED="false" hides it; unset/anything else shows it.
 */
export function useObjectivesEnabled(): boolean {
  return envOverride !== 'false';
}
