import { useMemo } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { resolveAvatarUrl } from "@/lib/avatars";

export function usePlayerAvatar() {
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);

  const avatarUrl = useMemo(
    () => resolveAvatarUrl(authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar),
    [authUser?.avatar_url, player.avatarCustomization?.base, player.avatar],
  );
  const avatarCustomization = authUser?.avatar_customization ?? player.avatarCustomization ?? null;

  return { avatarUrl, avatarCustomization, username: player.username };
}
