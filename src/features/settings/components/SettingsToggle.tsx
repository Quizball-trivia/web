import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { toast } from "sonner";

interface SettingsToggleProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  toastMessage?: string;
  disabled?: boolean;
}

export function SettingsToggle({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  toastMessage,
  disabled
}: SettingsToggleProps) {

  const handleChange = (newChecked: boolean) => {
    onCheckedChange(newChecked);
    if (newChecked && toastMessage) {
       toast.success(toastMessage, {
          icon: icon,
          className: "bg-background border-border"
       });
    }
  };

  return (
    <div className={cn(
       "flex items-center justify-between p-4 transition-colors hover:bg-muted/30",
       disabled && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-center gap-4">
        {icon && (
           <div className={cn(
              "p-2 rounded-xl transition-colors",
              checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
           )}>
              {icon}
           </div>
        )}
        <div>
           <div className="font-medium">{label}</div>
           {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={handleChange} disabled={disabled} />
    </div>
  );
}
