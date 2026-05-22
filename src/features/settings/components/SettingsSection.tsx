import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, icon, children, className }: SettingsSectionProps) {
  return (
    <div
      className={cn(
        "space-y-3",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-1">
        {icon && <div className="text-brand-cyan">{icon}</div>}
        <h2 className="font-fun text-base font-black uppercase tracking-wide text-white">
          {title}
        </h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page/72 shadow-[0_18px_48px_rgba(0,0,0,0.26)] backdrop-blur-xl divide-y divide-white/10">
        {children}
      </div>
    </div>
  );
}
