import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { publicGameDynamicParams, publicGameMetadata, publicGameStaticParams } from "../publicGamePage";
import * as enChain from "@/app/[locale]/(hub)/(word-shell)/football-games/football-name-chain/page";
import * as enRace from "@/app/[locale]/(hub)/(word-shell)/football-games/football-horserace/page";
import * as enCodenames from "@/app/[locale]/(hub)/(word-shell)/football-games/football-codenames/page";
import * as enConnections from "@/app/[locale]/(hub)/(word-shell)/football-games/football-connections/page";
import * as enDarts from "@/app/[locale]/(hub)/(word-shell)/football-games/football-darts-501/page";
import * as enOddOneOut from "@/app/[locale]/(hub)/(word-shell)/football-games/football-odd-one-out/page";
import * as enShared from "@/app/[locale]/(hub)/(word-shell)/football-games/played-for-both-clubs/page";
import * as esChain from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/cadena-de-futbolistas/page";
import * as esRace from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/carrera-de-caballos-futbolera/page";
import * as esCodenames from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/codenames-futbolero/page";
import * as esConexiones from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/conexiones-futboleras/page";
import * as esDardos from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/dardos-futboleros-501/page";
import * as esDatoFalso from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/dato-falso-futbolero/page";
import * as esShared from "@/app/[locale]/(hub)/(word-shell)/juegos-de-futbol/jugador-en-comun/page";
import * as trChain from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/son-harfle-futbolcu/page";
import * as trRace from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/futbol-at-yarisi/page";
import * as trCodenames from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/futbol-codenames/page";
import * as trConnections from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/futbol-connections/page";
import * as trDart from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/futbol-dart-oyunu/page";
import * as trHangisi from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/hangisi-yanlis/page";
import * as trShared from "@/app/[locale]/(hub)/(word-shell)/futbol-oyunlari/ortak-futbolcu-oyunu/page";
import { findPublishedGame } from "@/lib/seo/public-games";
import { isLightweightSeoRoute } from "@/lib/seo/lightweight-routes";

vi.mock("../PublicGameScreen", () => ({ PublicGameScreen: () => null }));
vi.mock("../DailyCollectionScreen", () => ({ DailyCollectionScreen: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));

const routes = [
  { folder: "football-games", slug: "football-name-chain", module: enChain },
  { folder: "football-games", slug: "played-for-both-clubs", module: enShared },
  { folder: "juegos-de-futbol", slug: "cadena-de-futbolistas", module: esChain },
  { folder: "juegos-de-futbol", slug: "jugador-en-comun", module: esShared },
  { folder: "futbol-oyunlari", slug: "son-harfle-futbolcu", module: trChain },
  { folder: "futbol-oyunlari", slug: "ortak-futbolcu-oyunu", module: trShared },
  { folder: "football-games", slug: "football-horserace", module: enRace },
  { folder: "juegos-de-futbol", slug: "carrera-de-caballos-futbolera", module: esRace },
  { folder: "futbol-oyunlari", slug: "futbol-at-yarisi", module: trRace },
  { folder: "football-games", slug: "football-codenames", module: enCodenames },
  { folder: "juegos-de-futbol", slug: "codenames-futbolero", module: esCodenames },
  { folder: "futbol-oyunlari", slug: "futbol-codenames", module: trCodenames },
  { folder: "football-games", slug: "football-odd-one-out", module: enOddOneOut },
  { folder: "juegos-de-futbol", slug: "dato-falso-futbolero", module: esDatoFalso },
  { folder: "futbol-oyunlari", slug: "hangisi-yanlis", module: trHangisi },
  { folder: "football-games", slug: "football-connections", module: enConnections },
  { folder: "juegos-de-futbol", slug: "conexiones-futboleras", module: esConexiones },
  { folder: "futbol-oyunlari", slug: "futbol-connections", module: trConnections },
  { folder: "football-games", slug: "football-darts-501", module: enDarts },
  { folder: "juegos-de-futbol", slug: "dardos-futboleros-501", module: esDardos },
  { folder: "futbol-oyunlari", slug: "futbol-dart-oyunu", module: trDart },
];
const modeOf: Record<string, string> = {
  "football-name-chain": "nameChain", "cadena-de-futbolistas": "nameChain", "son-harfle-futbolcu": "nameChain",
  "football-horserace": "footballRace", "carrera-de-caballos-futbolera": "footballRace", "futbol-at-yarisi": "footballRace",
  "football-codenames": "codenames", "codenames-futbolero": "codenames", "futbol-codenames": "codenames",
  "football-odd-one-out": "datoFalso", "dato-falso-futbolero": "datoFalso", "hangisi-yanlis": "datoFalso",
  "football-connections": "conexiones", "conexiones-futboleras": "conexiones", "futbol-connections": "conexiones",
  "football-darts-501": "darts501", "dardos-futboleros-501": "darts501", "futbol-dart-oyunu": "darts501",
};
const demoOf: Record<string, string> = { nameChain: "name-chain", footballRace: "football-horserace", codenames: "football-codenames", datoFalso: "dato-falso-futbolero", conexiones: "conexiones-futboleras", darts501: "football-darts-501", sharedPlayer: "shared-player" };
const key = ({ locale, slug }: { locale: string; slug: string }) => `${locale}/${slug}`;

describe("fixed word landing route parity", () => {
  it.each(["football-games", "juegos-de-futbol", "futbol-oyunlari"])("partitions %s without dropping or duplicating any published URL", (folder) => {
    const fixed = routes.filter((route) => route.folder === folder).flatMap((route) =>
      route.module.generateStaticParams().map(({ locale }) => ({ locale, slug: route.slug })),
    );
    const dynamic = publicGameDynamicParams(folder);
    const all = [...fixed, ...dynamic].map(key);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(publicGameStaticParams(folder).map(key).sort());
    expect(fixed.every((params) => !dynamic.some((other) => key(other) === key(params)))).toBe(true);
  });

  it("enumerates exactly twenty-eight word landings (Football Horserace, Football Codenames, Football Odd One Out, Football Connections and Football Darts 501 included) with unchanged metadata and rendering props", async () => {
    let count = 0;
    for (const route of routes) {
      expect(route.module.dynamicParams).toBe(false);
      for (const { locale } of route.module.generateStaticParams()) {
        count++;
        expect(isLightweightSeoRoute(`/${locale}/${route.folder}/${route.slug}`)).toBe(false);
        const game = findPublishedGame(locale, route.folder, route.slug);
        expect(game?.modeId).toBe(modeOf[route.slug] ?? "sharedPlayer");
        expect(game?.demoSlug).toBe(demoOf[game?.modeId ?? ""]);
        const params = Promise.resolve({ locale });
        expect(await route.module.generateMetadata({ params })).toEqual(
          await publicGameMetadata(route.folder, Promise.resolve({ locale, slug: route.slug })),
        );
        const element = route.module.default({ params }) as ReactElement<{ folder: string; params: Promise<{ locale: string; slug: string }> }>;
        expect(element.props.folder).toBe(route.folder);
        expect(await element.props.params).toEqual({ locale, slug: route.slug });
      }
    }
    expect(count).toBe(28);
  });

  it("keeps wrong-folder locales unavailable", async () => {
    await expect(enChain.generateMetadata({ params: Promise.resolve({ locale: "es" }) })).rejects.toThrow("404");
    await expect(esShared.generateMetadata({ params: Promise.resolve({ locale: "tr" }) })).rejects.toThrow("404");
    await expect(trShared.generateMetadata({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("404");
  });
});
