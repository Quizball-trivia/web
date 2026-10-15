"use client";

import { AppShellFrame } from "./AppShellFrame";
import { LanguageSwitcher, InPlaceLanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { ContactModal } from "@/components/shared/ContactModal";
import { AppShellProfileMenu } from "./app-shell/AppShellProfileMenu";
import { AppShellLogoutDialog } from "./app-shell/AppShellLogoutDialog";
import type { AppShellProps } from "./app-shell/appShell.types";
import type { ShellChromeComponents } from "./app-shell/shellChrome.types";

const chrome: ShellChromeComponents = { LanguageSwitcher, InPlaceLanguageSwitcher, SocialLinks, ContactModal, AppShellProfileMenu, AppShellLogoutDialog };

/** Default entry: original static widgets, no deferred-menu module. */
export function AppShell({ children }: AppShellProps) {
  return <AppShellFrame chrome={chrome}>{children}</AppShellFrame>;
}
