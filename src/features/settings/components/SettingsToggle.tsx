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
  disabled,
}: SettingsToggleProps) {
  const handleChange = (newChecked: boolean) => {
    onCheckedChange(newChecked);
    if (newChecked && toastMessage) {
      toast.success(toastMessage, {
        icon,
        className: "bg-background border-border",
      });
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.04]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border-b-2 transition-colors",
              checked
                ? "border-[#0F8AC4] bg-[#1CB0F6] text-white"
                : "border-[#0D1B21] bg-[#243B44] text-white/60",
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-fun text-sm font-black uppercase tracking-wide text-white">
            {label}
          </div>
          {description && (
            <div className="mt-0.5 text-xs text-white/55">{description}</div>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[#38B60E]"
      />
    </div>
  );
}
