"use client";

import { useState } from "react";
import { AvatarPreview } from "@/components/AvatarPreview";
import { JERSEY_PARTS, SKIN_PARTS, DEFAULT_SKIN_ID } from "@/lib/avatars/parts";
import type { AvatarCustomization } from "@/types/game";

export default function DevJerseysPage() {
  const [skin, setSkin] = useState<string>(DEFAULT_SKIN_ID);

  if (process.env.NODE_ENV !== "development") {
    return <div className="p-8 text-white">Dev only</div>;
  }

  return (
    <div className="min-h-screen bg-[#10121e] p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Jersey fit check — every jersey through the real AvatarPreview</h1>
        <div className="flex gap-2">
          {SKIN_PARTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkin(s.id)}
              className={`rounded px-2 py-1 text-xs ${skin === s.id ? "bg-purple-600" : "bg-white/10"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
        {JERSEY_PARTS.map((part) => {
          const customization = {
            skin,
            jersey: part.id,
            hair: "hair_boy_basic",
          } as unknown as AvatarCustomization;
          return (
            <div key={part.id} className="rounded-lg bg-white/5 p-2">
              <AvatarPreview customization={customization} width="100%" />
              <div className="mt-1 truncate text-center text-[11px] text-white/70">{part.id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
