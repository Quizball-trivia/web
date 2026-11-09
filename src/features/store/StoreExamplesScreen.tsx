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
import { StoreCategoryNav, type StoreCategory } from './components/StoreCategoryNav';
import { freshLocalStore, LOCAL_STORE_KEY, purchaseLocalPart, readLocalStore, serializeLocalStore, type LocalStoreState } from './localStorePreview';

export function StoreExamplesScreen() {
  const [state, setState] = useState(freshLocalStore);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [category, setCategory] = useState<StoreCategory>("all");
  // Mock ticket balance (cycle 0 → 5) so ticket-pack states can be checked here.
  const [tickets, setTickets] = useState(3);
  const [search, setSearch] = useState("");
  const { locale, setLocale, t } = useLocale();
  useEffect(() => {
    try { current.current = readLocalStore(localStorage.getItem(LOCAL_STORE_KEY)); }
    catch { current.current = freshLocalStore(); }
    // Restore this browser's local test outfit after hydration.
    setState(current.current);
    setReady(true);
  }, []);
  function commit(next: LocalStoreState) {
    current.current = next;
    setState(next);
    try { localStorage.setItem(LOCAL_STORE_KEY, serializeLocalStore(next)); }
    catch { toast.warning(t("store.previewStorageError")); }
  }
  function onEquip(customization: AvatarCustomization) { commit({ ...current.current, customization }); }
  function onPurchase(slug: string) { commit(purchaseLocalPart(current.current, slug)); }
  const localPreview = { ...state, onEquip, onPurchase, category, search, tickets };
  if (!ready) return <p className="p-8 text-white">{t("store.previewLoading")}</p>;
  return (
    <main className="min-h-screen bg-background text-white">
      <header className="mx-auto max-w-5xl px-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-fuchsia-400">{t("store.previewLabel")}</p>
            <h1 className="mt-2 text-3xl font-semibold">{t("store.previewTitle")}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">{t("store.previewDescription")}</p>
          </div>
          <select aria-label={t("store.previewLanguage")} value={locale} onChange={e => setLocale(e.target.value as typeof locale)} className="rounded-xl border border-white/20 bg-background p-2">
            <option value="en">English</option><option value="ka">ქართული</option><option value="es">Español</option>
          </select>
        </div>
        <section aria-label={t("store.previewEquipped")} className="mt-6 flex flex-wrap items-center justify-center gap-6 rounded-3xl border border-white/15 bg-store-card px-6 py-8 sm:justify-between">
          <div className="pt-5"><AvatarPreview customization={state.customization} width={210} /></div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-3"><AvatarDisplay customization={state.customization} size="lg" /><AvatarDisplay customization={state.customization} size="sm" shape="square" /></div>
            <p className="text-sm text-white/60">{t("store.previewSizes")}</p>
            <p className="text-lg font-semibold" data-testid="test-coins">{state.coins.toLocaleString()} {t("store.previewCoins")}</p>
            <button type="button" onClick={() => setTickets((n) => (n + 1) % 6)} className="text-left text-sm text-white/70 underline underline-offset-4">
              {t("store.ticketsTitle")}: {tickets}/5
            </button>
            <Link href="/dev/jerseys" className="text-center text-sm underline">{t("store.previewAdjust")}</Link>
            <button onClick={() => setEditorOpen(true)} className="rounded-2xl bg-store-accent px-6 py-3 font-semibold">{t("store.previewEdit")}</button>
            <button onClick={() => commit(freshLocalStore())} className="text-sm text-white/60 underline underline-offset-4">{t("store.previewReset")}</button>
          </div>
        </section>
      </header>
      <div className="sticky top-0 z-20 mx-auto mt-6 max-w-5xl px-4">
        <StoreCategoryNav category={category} onCategoryChange={setCategory} search={search} onSearchChange={setSearch} />
      </div>
      <StoreScreen localPreview={localPreview} />
      <AvatarPicker open={editorOpen} onOpenChange={setEditorOpen} currentCustomization={state.customization} localPreview={localPreview} onSelect={value => {
        try { onEquip(customizationFromAvatarValue(value)); setEditorOpen(false); toast.success(t('store.previewSaved')); }
        catch { toast.error(t('store.previewStorageError')); }
      }} />
    </main>
  );
}
