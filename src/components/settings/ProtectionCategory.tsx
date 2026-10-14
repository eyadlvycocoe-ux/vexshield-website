import { memo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AnticheatOption {
  id: string;
  name: string;
  enabled: boolean;
  action: "ban" | "kick" | "logs";
  l1?: boolean;
  l2?: boolean;
  l3?: boolean;
}

export function filterProtectionOptions(options: AnticheatOption[], query: string): AnticheatOption[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return options;
  return options.filter((o) => {
    const hay = `${o.name || ""} ${o.id || ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

interface ProtectionCategoryProps {
  title: string;
  icon: React.ReactNode;
  options: AnticheatOption[];
  setOptions: React.Dispatch<React.SetStateAction<AnticheatOption[]>>;
  description: string;
  filterQuery?: string;
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  ban: "text-sky-400",
  kick: "text-amber-300/90",
  logs: "text-slate-300",
};

export const ProtectionOptionRow = memo(
  ({
    option,
    onToggle,
    onActionChange,
    onLevelToggle,
  }: {
    option: AnticheatOption;
    onToggle: (id: string, checked: boolean) => void;
    onActionChange: (id: string, action: "ban" | "kick" | "logs") => void;
    onLevelToggle?: (id: string, level: "l1" | "l2" | "l3", checked: boolean) => void;
  }) => (
    <div className="settings-option-row break-inside-avoid">
      <span className="min-w-0 flex-1 truncate text-[14px] leading-tight text-slate-200">{option.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        {onLevelToggle && (
          <div className="flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-[#0a0f18]/80 p-0.5">
            {(["l1", "l2", "l3"] as const).map((levelKey) => {
              const isLevelActive = (option[levelKey] ?? option.enabled) && option.enabled;
              const label = levelKey.toUpperCase();
              return (
                <button
                  key={levelKey}
                  type="button"
                  onClick={() => onLevelToggle(option.id, levelKey, !isLevelActive)}
                  className={cn(
                    "flex h-4.5 w-5 items-center justify-center rounded text-[9px] font-bold transition-all",
                    isLevelActive
                      ? "border border-sky-500/40 bg-sky-500/20 text-sky-300 shadow-sm shadow-sky-500/10"
                      : "border border-white/[0.04] bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-400",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        <Select value={option.action} onValueChange={(v: "ban" | "kick" | "logs") => onActionChange(option.id, v)}>
          <SelectTrigger
            className={cn(
              "settings-action-select h-8 w-[5rem] border-white/[0.08] bg-[#0a0f18] px-2 text-xs font-semibold",
              ACTION_COLORS[option.action] ?? "",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0c1018]">
            <SelectItem value="ban" className="text-xs font-semibold text-sky-400">
              Ban
            </SelectItem>
            <SelectItem value="kick" className="text-xs font-semibold text-amber-300">
              Kick
            </SelectItem>
            <SelectItem value="logs" className="text-xs font-semibold text-slate-300">
              Logs
            </SelectItem>
          </SelectContent>
        </Select>
        <Switch
          checked={option.enabled}
          onCheckedChange={(checked) => onToggle(option.id, checked)}
          className="h-5 w-9 data-[state=checked]:bg-sky-500 data-[state=unchecked]:bg-white/15 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
        />
      </div>
    </div>
  ),
);

ProtectionOptionRow.displayName = "ProtectionOptionRow";

export const ProtectionCategory = memo(
  ({ title, icon, options, setOptions, description, filterQuery, className }: ProtectionCategoryProps) => {
    const onToggle = useCallback(
      (id: string, checked: boolean) => {
        setOptions((prev) =>
          prev.map((o) => (o.id === id ? { ...o, enabled: checked, l1: checked, l2: checked, l3: checked } : o)),
        );
      },
      [setOptions],
    );

    const onActionChange = useCallback(
      (id: string, action: "ban" | "kick" | "logs") => {
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, action } : o)));
      },
      [setOptions],
    );

    const onLevelToggle = useCallback(
      (id: string, levelKey: "l1" | "l2" | "l3", checked: boolean) => {
        setOptions((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const newL1 = levelKey === "l1" ? checked : (o.l1 ?? o.enabled);
            const newL2 = levelKey === "l2" ? checked : (o.l2 ?? o.enabled);
            const newL3 = levelKey === "l3" ? checked : (o.l3 ?? o.enabled);
            const anyEnabled = newL1 || newL2 || newL3;
            return {
              ...o,
              enabled: anyEnabled,
              l1: newL1,
              l2: newL2,
              l3: newL3,
            };
          }),
        );
      },
      [setOptions],
    );

    const visible = filterProtectionOptions(options, filterQuery || "");

    return (
      <div className={cn("settings-card flex h-full min-h-0 flex-col", className)}>
        <div className="settings-card-header">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">{title}</h2>
            <p className="truncate text-xs text-slate-400">{description}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {visible.filter((o) => o.enabled).length}/{visible.length}
          </span>
        </div>

        <div className="settings-options-grid min-h-0 flex-1">
          {visible.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">No matching options</p>
          ) : (
            visible.map((option) => (
              <ProtectionOptionRow key={option.id} option={option} onToggle={onToggle} onActionChange={onActionChange} onLevelToggle={onLevelToggle} />
            ))
          )}
        </div>
      </div>
    );
  },
);

ProtectionCategory.displayName = "ProtectionCategory";
