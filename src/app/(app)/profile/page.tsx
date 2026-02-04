"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { updateMe } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";

export default function ProfilePage() {
  const router = useRouter();
  const { player, updateStats } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleNameChange = async (name: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await updateMe({ nickname: name });
      updateStats({ username: name });
      if (authUser) {
        setAuthenticated({ ...authUser, nickname: updated.nickname ?? name });
      }
      toast.success("Nickname updated");
    } catch (error) {
      toast.error("Failed to update nickname", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    try {
      const updated = await updateMe({ avatar_url: avatarUrl });
      updateStats({ avatarCustomization: { base: avatarUrl } });
      if (authUser) {
        setAuthenticated({ ...authUser, avatar_url: updated.avatar_url ?? avatarUrl });
      }
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Failed to update avatar", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <ProfileScreen
      player={player}
      avatarUrl={authUser?.avatar_url ?? null}
      onNavigateToStore={() => router.push("/store")}
      onNavigateToSettings={() => router.push("/settings")}
      onFeatureFlagsChange={() => {}}
      onNameChange={handleNameChange}
      onAvatarChange={handleAvatarChange}
      isUpdating={isUpdating}
    />
  );
}
