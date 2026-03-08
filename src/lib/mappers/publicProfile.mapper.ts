import type { PublicProfile } from "@/lib/domain";
import type { PublicProfileResponse } from "@/lib/repositories/users.repo";

/** Identity mapper — kept for consistency with the mapper-per-domain convention. */
export function toPublicProfile(response: PublicProfileResponse): PublicProfile {
  return { ...response };
}
