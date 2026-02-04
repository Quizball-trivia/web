import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className={cn("border-border/60 bg-card/50 overflow-hidden", className)}>
      <CardHeader className="py-4 px-5 border-b border-border/40 flex flex-row items-center gap-3">
        {icon && <div className="text-primary">{icon}</div>}
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
           {children}
        </div>
      </CardContent>
    </Card>
  );
}
