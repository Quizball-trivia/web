import { useMemo } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { resolveAvatarUrl } from "@/lib/avatars";

export function usePlayerAvatar() {
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);

  const avatarUrl = useMemo(
    () =>
      resolveAvatarUrl(
        authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar,
        "player",
        256,
      ),
    [authUser?.avatar_url, player.avatarCustomization?.base, player.avatar],
  );

  return { avatarUrl, username: player.username };
}
