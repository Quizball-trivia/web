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
        "overflow-hidden rounded-2xl bg-black",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b-2 border-white/10 px-5 py-4">
        {icon && <div className="text-brand-cyan">{icon}</div>}
        <h2 className="font-fun text-base font-black uppercase tracking-wide text-white">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </div>
  );
}
