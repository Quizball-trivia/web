import { notFound } from 'next/navigation';
import { AvatarPreview } from '@/components/AvatarPreview';
import { COLLECTION_PARTS } from '@/lib/avatars/collection';
import { customizationFromAvatarValue } from '@/lib/avatars';

export default async function FitPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { slot } = await searchParams;
  const items = COLLECTION_PARTS.filter(p => !slot || (slot === "extras" ? !["jersey", "hair"].includes(p.slot) : p.slot === slot));
  const base = customizationFromAvatarValue(null);
  return <main className="mx-auto max-w-6xl p-8">
    <h1 className="mb-8 text-2xl font-semibold">Collection fit check</h1>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map(part => <div key={part.id} className="flex flex-col items-center rounded-2xl bg-store-card px-2 pt-10 pb-3">
        <AvatarPreview customization={{ ...base, [part.slot]: part.id }} width={190} />
        <p className="text-center text-sm">{part.name}</p>
      </div>)}
    </div>
  </main>;
}
