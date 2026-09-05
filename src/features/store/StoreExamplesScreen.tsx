'use client';

import Link from "next/link";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AvatarPreview } from '@/components/AvatarPreview';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { customizationFromAvatarValue } from '@/lib/avatars';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';
import { StoreScreen } from './StoreScreen';
import { freshLocalStore, LOCAL_STORE_KEY, purchaseLocalPart, readLocalStore, serializeLocalStore, type LocalStoreState } from './localStorePreview';

export function StoreExamplesScreen() {
  const [state, setState] = useState(freshLocalStore);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [category, setCategory] = useState("hair");
  const [search, setSearch] = useState("");
  const { locale, setLocale } = useLocale();
  useEffect(() => {
    try { current.current = readLocalStore(localStorage.getItem(LOCAL_STORE_KEY)); }
    catch { current.current = freshLocalStore(); }
    // Restore this browser's local test outfit after hydration.
    setState(current.current);
    setReady(true);
  }, []);
  function commit(next: LocalStoreState) {
    localStorage.setItem(LOCAL_STORE_KEY, serializeLocalStore(next));
    current.current = next;
    setState(next);
  }
  function onEquip(customization: AvatarCustomization) { commit({ ...current.current, customization }); }
  function onPurchase(slug: string) { commit(purchaseLocalPart(current.current, slug)); }
  const localPreview = { ...state, onEquip, onPurchase, category, search };
  if (!ready) return <p className="p-8 text-white">Loading your store preview…</p>;
  return (
    <main className="min-h-screen bg-background text-white">
      <header className="mx-auto max-w-5xl px-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-fuchsia-400">Local store preview</p>
            <h1 className="mt-2 text-3xl font-semibold">Try your new look</h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">Iconic player looks, club and country jerseys, headwear and accessories. Use test coins to build your outfit; your look is saved in this browser.</p>
          </div>
          <select aria-label="Language" value={locale} onChange={e => setLocale(e.target.value as typeof locale)} className="rounded-xl border border-white/20 bg-background p-2">
            <option value="en">English</option><option value="ka">ქართული</option><option value="es">Español</option>
          </select>
        </div>
        <section aria-label="Your equipped avatar" className="mt-6 flex flex-wrap items-center justify-center gap-6 rounded-3xl border border-white/15 bg-[#0B1619] px-6 py-8 sm:justify-between">
          <div className="pt-5"><AvatarPreview customization={state.customization} width={210} /></div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-3"><AvatarDisplay customization={state.customization} size="lg" /><AvatarDisplay customization={state.customization} size="sm" shape="square" /></div>
            <p className="text-sm text-white/60">Profile and game avatar sizes</p>
            <p className="text-lg font-semibold" data-testid="test-coins">{state.coins.toLocaleString()} test coins</p>
            <Link href="/dev/jerseys" className="text-center text-sm underline">Adjust item positions</Link>
            <button onClick={() => setEditorOpen(true)} className="rounded-2xl bg-[#BA02E8] px-6 py-3 font-semibold">Edit avatar</button>
            <button onClick={() => { try { commit(freshLocalStore()); } catch { toast.error('Could not reset browser storage'); } }} className="text-sm text-white/60 underline underline-offset-4">Reset test · 2 million coins</button>
          </div>
        </section>
      </header>
      <nav aria-label="Store categories" className="sticky top-0 z-20 mx-auto mt-6 max-w-5xl border-y border-white/10 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {[['hair','Player hair'],['jerseys','Jerseys'],['headwear','Headwear'],['accessories','Accessories'],['glasses','Glasses'],['facialHair','Facial hair'],['all','Everything']].map(([id,label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm aria-pressed:border-fuchsia-500 aria-pressed:bg-fuchsia-950">{label}</button>)}
        </div>
        <input type="search" aria-label="Find an item" placeholder="Find a player, team or item…" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0b1619] px-4 py-2 text-sm" />
      </nav>
      <StoreScreen localPreview={localPreview} />
      <AvatarPicker open={editorOpen} onOpenChange={setEditorOpen} currentCustomization={state.customization} localPreview={localPreview} onSelect={value => {
        try { onEquip(customizationFromAvatarValue(value)); setEditorOpen(false); toast.success('Look saved'); }
        catch { toast.error('Could not save to browser storage'); }
      }} />
    </main>
  );
}
