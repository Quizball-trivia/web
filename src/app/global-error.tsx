"use client";

import { useEffect, useState } from "react";
import { partnerFromHost } from "@/features/partner/partnerHosts";
import { isLoadFailure, reloadRestores } from "@/lib/recovery/loadFailure";

type Language = "en" | "ka" | "es" | "tr" | "ru" | "pt" | "de";
type Way = "reload" | "home" | "relaunch";

// This screen replaces the root layout, so it has no providers, stylesheet or dictionaries to lean on.
const COPY: Record<Language, { title: string; loadFailed: string; crashed: string; home: string; relaunch: string; reload: string; back: string }> = {
  en: {
    title: "Something went wrong",
    loadFailed: "A part of the page did not load. Check your connection and reload.",
    crashed: "The page ran into a problem. Reloading usually fixes it.",
    home: "This screen could not load. Go back to Quizball to rejoin your match.",
    relaunch: "This screen could not load. Reload, then open the game again from the site you came from.",
    reload: "Reload",
    back: "Back to Quizball",
  },
  ka: {
    title: "რაღაც შეფერხდა",
    loadFailed: "გვერდის ნაწილი ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი და გადატვირთე.",
    crashed: "გვერდზე შეცდომა მოხდა. გადატვირთვა ჩვეულებრივ შველის.",
    home: "ეს ეკრანი ვერ ჩაიტვირთა. მატჩში დასაბრუნებლად გადადი Quizball-ზე.",
    relaunch: "ეს ეკრანი ვერ ჩაიტვირთა. გადატვირთე და თამაში ხელახლა გახსენი იმ საიტიდან, საიდანაც შემოხვედი.",
    reload: "გადატვირთვა",
    back: "Quizball-ზე დაბრუნება",
  },
  es: {
    title: "Algo ha fallado",
    loadFailed: "Una parte de la página no se cargó. Revisa tu conexión y recarga.",
    crashed: "La página tuvo un problema. Recargar suele arreglarlo.",
    home: "Esta pantalla no se pudo cargar. Vuelve a Quizball para reincorporarte a tu partida.",
    relaunch: "Esta pantalla no se pudo cargar. Recarga y abre el juego de nuevo desde el sitio del que viniste.",
    reload: "Recargar",
    back: "Volver a Quizball",
  },
  tr: {
    title: "Bir şeyler ters gitti",
    loadFailed: "Sayfanın bir bölümü yüklenemedi. Bağlantını kontrol edip yeniden yükle.",
    crashed: "Sayfada bir sorun oluştu. Yeniden yüklemek genelde çözer.",
    home: "Bu ekran yüklenemedi. Maçına dönmek için Quizball'a geri git.",
    relaunch: "Bu ekran yüklenemedi. Yeniden yükle, sonra oyunu geldiğin siteden tekrar aç.",
    reload: "Yeniden yükle",
    back: "Quizball'a dön",
  },
  ru: {
    title: "Что-то пошло не так",
    loadFailed: "Часть страницы не загрузилась. Проверь соединение и перезагрузи страницу.",
    crashed: "На странице возникла проблема. Обычно помогает перезагрузка.",
    home: "Не удалось загрузить этот экран. Вернись в Quizball, чтобы снова подключиться к матчу.",
    relaunch: "Не удалось загрузить этот экран. Перезагрузи страницу, а затем снова открой игру на сайте, откуда ты пришёл.",
    reload: "Перезагрузить",
    back: "Вернуться в Quizball",
  },
  pt: {
    title: "Algo deu errado",
    loadFailed: "Parte da página não carregou. Confira sua conexão e recarregue.",
    crashed: "A página teve um problema. Recarregar geralmente resolve.",
    home: "Esta tela não carregou. Volte ao Quizball para voltar à sua partida.",
    relaunch: "Esta tela não carregou. Recarregue e abra o jogo novamente pelo site de onde você veio.",
    reload: "Recarregar",
    back: "Voltar ao Quizball",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    loadFailed: "Ein Teil der Seite wurde nicht geladen. Prüfe deine Verbindung und lade neu.",
    crashed: "Auf der Seite ist ein Problem aufgetreten. Meist hilft es, sie neu zu laden.",
    home: "Dieser Bildschirm konnte nicht geladen werden. Kehre zu Quizball zurück, um dein Match fortzusetzen.",
    relaunch: "Dieser Bildschirm konnte nicht geladen werden. Lade neu und öffne das Spiel anschließend wieder über die Website, von der du gekommen bist.",
    reload: "Neu laden",
    back: "Zurück zu Quizball",
  },
};

/** Kept local: this screen must not depend on the app's locale modules. */
const documentLang = (language: Language): string => (language === "pt" ? "pt-BR" : language);
const isLanguage = (value: unknown): value is Language => value === "en" || value === "ka" || value === "es" || value === "tr" || value === "ru" || value === "pt" || value === "de";

function readLanguage(documentLanguage: string): Language {
  const fromPath = window.location.pathname.split("/")[1];
  if (isLanguage(fromPath)) return fromPath;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem("quizball_locale") ?? "null");
    if (isLanguage(stored)) return stored;
  } catch { /* fall through to the language the page had */ }
  return isLanguage(documentLanguage) ? documentLanguage : "en";
}

const PRIMARY = { minHeight: 48, padding: "0 28px", border: 0, borderRadius: 14, background: "#38B60E", color: "#fff", fontSize: 15, fontWeight: 800, textTransform: "uppercase", cursor: "pointer" } as const;
const QUIET = { display: "block", margin: "16px auto 0", padding: 8, border: 0, background: "none", color: "rgba(255,255,255,0.75)", fontSize: 14, textDecoration: "underline", cursor: "pointer" } as const;

/**
 * Nothing here reloads on its own: on a results screen a reload starts the next match, and a partner launch or a
 * sign-in callback does not survive one. The player chooses.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  const loadFailed = isLoadFailure(error);
  // Read before this screen's own <html> replaces the attribute.
  // <html lang> may carry a region (pt-BR); the screen keys its copy by the base language.
  const [pageLanguage] = useState(() => (typeof document === "undefined" ? "" : document.documentElement.lang.split("-")[0]));
  const [view, setView] = useState<{ language: Language; way: Way } | null>(null);

  useEffect(() => {
    const { pathname, host } = window.location;
    const way: Way = partnerFromHost(host) ? "relaunch" : reloadRestores(pathname) ? "reload" : "home";
    queueMicrotask(() => setView({ language: readLanguage(pageLanguage), way }));
  }, [pageLanguage]);

  const copy = COPY[view?.language ?? "en"];
  return (
    <html lang={documentLang(view?.language ?? (isLanguage(pageLanguage) ? pageLanguage : "en"))}>
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#071013", color: "#fff", fontFamily: "Poppins, system-ui, sans-serif" }}>
        {view && (
          <main style={{ maxWidth: 360, padding: 24, textAlign: "center" }} data-recovery={loadFailed ? "load" : "crash"}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{copy.title}</h1>
            <p style={{ margin: "12px 0 24px", fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,0.75)" }}>
              {view.way === "home" ? copy.home : view.way === "relaunch" ? copy.relaunch : loadFailed ? copy.loadFailed : copy.crashed}
            </p>
            {view.way !== "home" && (
              <button type="button" onClick={() => window.location.reload()} data-recovery-action="reload" style={PRIMARY}>{copy.reload}</button>
            )}
            {/* A full navigation on purpose: the client router may be the part that failed to load. */}
            {view.way !== "relaunch" && (
              <button type="button" onClick={() => window.location.assign("/")} data-recovery-action="home" style={view.way === "home" ? PRIMARY : QUIET}>{copy.back}</button>
            )}
          </main>
        )}
      </body>
    </html>
  );
}
