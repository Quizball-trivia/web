import { footballGridStorageImageUrl } from '@/lib/football-grid/assets';

/**
 * Portraits for the tutorial board's players, by the fixture's display name.
 * Paths are relative to the public `imgs` bucket: `players/<id>.webp` lives
 * under the Grid CDN release (same on every environment), `player-images/…`
 * is the legacy catalogue portrait. Resolved through the Grid asset policy at
 * render time, so a missing file falls back to the silhouette like live play.
 * Players without a catalogue portrait are simply absent here.
 */
const PORTRAITS: Record<string, string> = {
  "Adrien Rabiot": "players/9ecf55af-5df1-4059-ba07-e494dbca3a22.webp",
  "Alejandro Garnacho": "players/19480b61-2f4d-4d04-b81a-b81c9442aa02.webp",
  "Alex Sandro": "players/6c43a511-faef-429b-b571-98578823e1a6.webp",
  "Alfredo Di Stéfano": "players/a5f26812-e6ad-4b9a-b853-6e2f76e857ff.jpg",
  "Anderson": "players/82b16bb4-3f20-4f66-8c54-02825ad45650.webp",
  "Anthony Martial": "players/d0b1dde2-6996-48db-afb5-49f118b0c30c.webp",
  "Antony": "players/fa30601e-a35f-42c6-b86f-8d8b183f0736.webp",
  "Arthur": "players/726edf94-17d6-47b5-8e53-5095f41361e3.webp",
  "Blaise Matuidi": "players/32e19109-edbe-47f8-b20c-f7b577a30a83.webp",
  "Carlos Tevez": "players/70b63468-1914-4c8e-ad35-199485821756.webp",
  "Casemiro": "players/5ecd7d07-810b-4bc2-bcc7-36b5eee2c8c8.webp",
  "Danilo": "players/a699ef39-f6a6-4740-ba9e-02f193acabd8.webp",
  "Douglas Costa": "players/120d0649-086e-48cd-808a-966ee8191ee8.webp",
  "Eduardo Camavinga": "players/a8fc8802-2e67-48c7-95e2-39d32097d6e8.webp",
  "Emerson": "players/751d2821-1fda-435e-9d8b-be4881e16b1b.webp",
  "Eric Cantona": "player-images/7ae2bc37-5701-4d38-83e9-e4b21eb08951.webp",
  "Fred": "players/9c026c2b-efbb-4e7c-9f3d-fe584f907d3c.webp",
  "Gonzalo Higuaín": "players/bf8492a7-7d36-4731-b093-218a7564472b.webp",
  "Juan Sebastián Verón": "players/5c1a9f3d-b4c7-4c09-b180-98067e17ed6b.jpg",
  "Kaká": "players/77c1d7e6-4d5e-4bb1-a145-b1282b181724.webp",
  "Karim Benzema": "players/79a18ff7-b3e4-42cd-b497-600e86dbd631.webp",
  "Kylian Mbappé": "players/7e969cc5-120d-4af9-9fdd-f6d2db3170a8.webp",
  "Marcelo": "players/f1a6dc16-5fcf-448c-92ab-88153533f811.webp",
  "Marcos Rojo": "players/0d776e3a-ab7c-42a0-b23f-7ac6057f416a.webp",
  "Patrice Evra": "players/252ed9f2-8daa-4c7a-b3f2-5c24eece525f.webp",
  "Paul Pogba": "players/94ae19d5-de36-4e4e-8a9f-3d0db0904707.webp",
  "Paulo Dybala": "players/ce338858-75c4-4a18-bae4-9d485b61ec12.webp",
  "Rafael": "players/3efa7270-5130-4ca2-ab2e-d79018d04652.webp",
  "Raphaël Varane": "players/7a8f230c-cadf-45a7-820e-d12948a1479c.webp",
  "Roberto Carlos": "players/3fc652f4-bca7-4365-99bd-fedc5309ef41.jpg",
  "Ronaldo Nazário": "players/79f167d2-9d12-4f3e-91c0-0fbbf1b7d994.jpg",
  "Santiago Solari": "players/db0d9179-f5db-4aab-934f-d2e86798153d.webp",
  "Vinícius Júnior": "players/de965f63-5812-4ab3-b35b-e914867dc6e7.webp",
  "Zinedine Zidane": "player-images/e4da368d-83e5-42c1-b1b2-4309d0299309.webp",
  "Ángel Di María": "players/87560b0d-f5b9-4181-ac9b-040a207c3e9a.webp",
};

export function trainingPortraitUrl(playerName: string): string | null {
  const path = PORTRAITS[playerName];
  return path ? footballGridStorageImageUrl(path) : null;
}
