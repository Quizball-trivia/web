/** Types only: the frame must not pull either widget implementation into its graph. */
import type { ComponentProps, ComponentType } from "react";

export type ShellChromeComponents = {
  LanguageSwitcher: ComponentType<ComponentProps<typeof import("../../i18n/LanguageSwitcher").LanguageSwitcher>>;
  InPlaceLanguageSwitcher: ComponentType<ComponentProps<typeof import("../../i18n/LanguageSwitcher").InPlaceLanguageSwitcher>>;
  SocialLinks: ComponentType<ComponentProps<typeof import("../../shared/SocialLinks").SocialLinks>>;
  ContactModal: ComponentType<ComponentProps<typeof import("../../shared/ContactModal").ContactModal>>;
  AppShellProfileMenu: ComponentType<ComponentProps<typeof import("./AppShellProfileMenu").AppShellProfileMenu>>;
  AppShellLogoutDialog: ComponentType<ComponentProps<typeof import("./AppShellLogoutDialog").AppShellLogoutDialog>>;
};
