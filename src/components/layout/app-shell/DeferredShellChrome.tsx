"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ComponentProps, type KeyboardEvent } from "react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { CountryFlag } from "@/components/CountryFlag";
import { useLocale } from "@/contexts/LocaleContext";
import { LOCALES } from "@/lib/i18n/locale-config";
import { isLocale } from "@/lib/i18n/locale";
import { isWordGameLandingPath } from "@/lib/word-game-critical-assets";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";
import { contactChrome, languageChrome, logoutChrome, profileChrome, socialChrome } from "./shellChromeLoader";
import { useShellPopupIntent } from "./useShellPopupIntent";

type LanguageProps = ComponentProps<typeof import("../../i18n/LanguageSwitcher").LanguageSwitcher>;
type InPlaceProps = ComponentProps<typeof import("../../i18n/LanguageSwitcher").InPlaceLanguageSwitcher>;
type SocialProps = ComponentProps<typeof import("../../shared/SocialLinks").SocialLinks>;
type ContactProps = ComponentProps<typeof import("../../shared/ContactModal").ContactModal>;
type ProfileProps = ComponentProps<typeof import("./AppShellProfileMenu").AppShellProfileMenu>;
type LogoutProps = ComponentProps<typeof import("./AppShellLogoutDialog").AppShellLogoutDialog>;

// Literal next/dynamic imports preserve SSR/preloading outside the eight pages.
// These relative requests intentionally do not match the narrow webpack rewrite.
const OriginalLanguage = dynamic(() => import("../../i18n/LanguageSwitcher").then(m => m.LanguageSwitcher));
const OriginalInPlace = dynamic(() => import("../../i18n/LanguageSwitcher").then(m => m.InPlaceLanguageSwitcher));
const OriginalSocial = dynamic(() => import("../../shared/SocialLinks").then(m => m.SocialLinks));
const OriginalContact = dynamic(() => import("../../shared/ContactModal").then(m => m.ContactModal));
const OriginalProfile = dynamic(() => import("./AppShellProfileMenu").then(m => m.AppShellProfileMenu));
const OriginalLogout = dynamic(() => import("./AppShellLogoutDialog").then(m => m.AppShellLogoutDialog));

function LoadError() {
  const { t } = useLocale();
  return <span role="alert" className="sr-only">{t("errors.EXTERNAL_SERVICE_ERROR")}</span>;
}

export function LanguageSwitcher(props: LanguageProps) {
  const pathname = usePathname() ?? "";
  return isWordGameLandingPath(pathname) ? <DeferredLanguage key={pathname} {...props} /> : <OriginalLanguage {...props} />;
}

function DeferredLanguage(props: LanguageProps) {
  const pathname = usePathname() ?? "";
  const first = pathname.split("/").filter(Boolean)[0];
  const locale = isLocale(first) ? first : props.locale;
  const option = LOCALES.find(item => item.code === locale)!;
  const { t } = useLocale();
  const intent = useShellPopupIntent(languageChrome);
  const focusConsumed = useRef(false);
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    intent.activate(event.currentTarget, event.key === "ArrowUp" ? "last" : "first");
  };
  const ready = intent.ready;
  if (ready) return <ready.module.LanguageSwitcher {...props} initialOpen onMenuFocusCapture={event => {
    if (focusConsumed.current) return;
    focusConsumed.current = true;
    if (ready.focus === "pointer") return;
    const items = event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled])');
    (ready.focus === "last" ? items[items.length - 1] : items[0])?.focus();
  }} publicLink={ready.module.PublicLanguageLink} />;
  return <>
    <button type="button" aria-label={t("languageSwitcher.chooseLanguage", { language: option.nativeName })} title={option.nativeName}
      aria-haspopup="menu" aria-expanded={false} aria-busy={intent.pending || undefined}
      className={cn("group inline-flex size-10 items-center justify-center rounded-full bg-transparent text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-yellow/60 data-[state=open]:bg-white/10", props.className)}
      onPointerEnter={intent.preload} onFocus={intent.preload} onKeyDown={keyboard}
      onClick={event => intent.activate(event.currentTarget, event.detail === 0 ? "first" : "pointer")}>
      <CountryFlag code={option.countryCode} className="!h-5 !w-7 rounded-[3px]" />
    </button>
    {intent.failed && <LoadError />}
  </>;
}

export function InPlaceLanguageSwitcher(props: InPlaceProps) { return <OriginalInPlace {...props} />; }

export function ContactModal(props: ContactProps) {
  const pathname = usePathname() ?? "";
  return isWordGameLandingPath(pathname) && isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(props.trigger) && props.trigger.type === "button"
    ? <DeferredContact key={pathname} {...props} /> : <OriginalContact {...props} />;
}

function DeferredContact(props: ContactProps) {
  const intent = useShellPopupIntent(contactChrome);
  if (intent.ready) return <intent.ready.module.ContactModal {...props} initialOpen />;
  if (!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(props.trigger)) return <OriginalContact {...props} />;
  const trigger = props.trigger;
  return <>
    {cloneElement(trigger, {
      "aria-haspopup": "dialog", "aria-expanded": false, "aria-busy": intent.pending || undefined,
      onFocus: event => { trigger.props.onFocus?.(event); intent.preload(); },
      onPointerEnter: event => { trigger.props.onPointerEnter?.(event); intent.preload(); },
      onClick: event => { trigger.props.onClick?.(event); if (!event.defaultPrevented) intent.activate(event.currentTarget); },
    })}
    {intent.failed && <LoadError />}
  </>;
}

export function SocialLinks(props: SocialProps) {
  const pathname = usePathname() ?? "";
  return isWordGameLandingPath(pathname) ? <DeferredSocial key={pathname} {...props} /> : <OriginalSocial {...props} />;
}

function DeferredSocial(props: SocialProps) {
  const intent = useShellPopupIntent(socialChrome);
  const s = { xs: { box: "size-7", icon: "size-3.5" }, sm: { box: "size-9", icon: "size-4" }, md: { box: "size-11", icon: "size-5" } }[props.size ?? "md"];
  const tileClass = cn("flex items-center justify-center rounded-[14px] text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]", "transition-transform hover:-translate-y-0.5 active:translate-y-0", s.box);
  if (intent.ready) return <intent.ready.module.SocialLinks {...props} initialFacebookOpen />;
  return <div className={cn("flex items-center justify-center gap-2.5", props.className)}>
    <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className={tileClass}
      style={{ background: "linear-gradient(135deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)" }}><FaInstagram className={s.icon} /></a>
    <button type="button" aria-label="Facebook" title="Facebook" aria-haspopup="dialog" aria-expanded={false} aria-busy={intent.pending || undefined}
      className={tileClass} style={{ background: "#1877F2" }} onFocus={intent.preload} onPointerEnter={intent.preload}
      onClick={event => intent.activate(event.currentTarget)}><FaFacebookF className={s.icon} /></button>
    {intent.failed && <LoadError />}
  </div>;
}

function useImmediateModule<T>(loader: { peek: () => T | undefined; load: () => Promise<T> }) {
  const [module, setModule] = useState<T | undefined>(() => loader.peek());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (module) return;
    let active = true;
    void loader.load().then(value => { if (active) setModule(() => value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [loader, module, attempt]);
  return { module, failed, retry: () => { setFailed(false); setAttempt(value => value + 1); } };
}

export function AppShellProfileMenu(props: ProfileProps) {
  const pathname = usePathname() ?? "";
  return isWordGameLandingPath(pathname) ? <MemberProfile {...props} /> : <OriginalProfile {...props} />;
}

/** AppShell only renders this once auth is conclusively authenticated. */
function MemberProfile(props: ProfileProps) {
  const { module, failed, retry } = useImmediateModule(profileChrome);
  const { t } = useLocale();
  if (module) return <module.AppShellProfileMenu {...props} />;
  const desktop = props.variant === "desktop";
  return <div className={desktop ? "flex items-center gap-3 rounded-full px-1 py-1" : "flex min-w-0 items-center gap-2 rounded-full"} role="status" aria-busy={!failed}>
    <div aria-hidden="true" className="shrink-0" style={{ width: 44, height: 62 }} />
    <div className={desktop ? "text-left" : "flex min-w-0 flex-col items-start text-left"}>
      <div className={desktop ? "text-sm font-black uppercase tracking-wide text-white" : "max-w-[8.5rem] truncate text-sm font-black uppercase tracking-[0.03em] text-white"}>{props.playerStats.username}</div>
      {desktop ? <div className="mt-0.5 inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-black text-black">{props.playerStats.rankPoints ?? 0}RP</div> : <div className="mt-1 inline-flex flex-col items-center self-start rounded-full bg-brand-yellow px-3 py-1 font-black uppercase leading-none text-black"><span className="text-[12px] tabular-nums">{props.playerStats.rankPoints ?? 0}</span><span className="text-[9px] tracking-wide">RP</span></div>}
      <span className="sr-only">{t("common.loading")}</span>
    </div>
    {failed && <><LoadError /><button type="button" onClick={retry}>{t("common.tryAgain")}</button></>}
  </div>;
}

export function AppShellLogoutDialog(props: LogoutProps) {
  const pathname = usePathname() ?? "";
  if (!isWordGameLandingPath(pathname)) return <OriginalLogout {...props} />;
  return props.open ? <DeferredLogout key={pathname} {...props} /> : null;
}

function DeferredLogout(props: LogoutProps) {
  const { onOpenChange } = props;
  const { module, failed, retry } = useImmediateModule(logoutChrome);
  const { t } = useLocale();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openingPath = useRef<string | null>(null);
  const title = useId();
  const restoreFocus = () => {
    if (openingPath.current === window.location.pathname && opener.current?.isConnected) opener.current.focus();
  };
  useEffect(() => {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body && !active.closest('[role="menu"]') ? active :
      [...document.querySelectorAll<HTMLElement>("[data-qb-profile-trigger]")].find(element => element.getClientRects().length > 0) ?? null;
    openingPath.current = window.location.pathname;
    return () => { queueMicrotask(() => { if (openingPath.current === window.location.pathname && opener.current?.isConnected) opener.current.focus(); }); };
  }, []);
  useEffect(() => {
    if (module) return;
    cancelButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onOpenChange(false); }
      if (event.key === "Tab") {
        const buttons = container.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        event.preventDefault();
        const index = [...buttons].indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey, true); };
  }, [module, onOpenChange]);
  if (module) return <module.AppShellLogoutDialog {...props} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }} />;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
    <div ref={container} role="alertdialog" aria-modal="true" aria-labelledby={title} className="w-[92vw] max-w-md rounded-[24px] bg-brand-blue p-8 text-center font-poppins text-white">
      <h2 id={title} className="text-[22px] font-semibold">{t("accountMenu.logOutQuestion")}</h2>
      <p className="my-4 text-sm" role={failed ? "alert" : "status"}>{t(failed ? "errors.EXTERNAL_SERVICE_ERROR" : "common.loading")}</p>
      {failed && <button type="button" onClick={retry} className="mb-2 w-full rounded-[16px] bg-brand-yellow p-3 text-black">{t("common.tryAgain")}</button>}
      <button ref={cancelButton} type="button" onClick={() => props.onOpenChange(false)} className="w-full rounded-[16px] bg-white/15 p-3">{t("common.cancel")}</button>
    </div>
  </div>;
}
