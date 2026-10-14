import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages  } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ensureLocaleLoaded, SUPPORTED_LANGUAGES } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [changing, setChanging] = useState(false);
  const currentCode = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  const changeLanguage = async (code: string) => {
    if (code === currentCode || changing) return;
    setChanging(true);
    try {
      await ensureLocaleLoaded(code);
      await i18n.changeLanguage(code);
    } finally {
      setChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "shrink-0 border border-white/[0.08] bg-white/[0.02] p-0 text-slate-300 hover:bg-white/[0.06] hover:text-white",
            compact ? "h-8 w-8" : "h-9 w-9",
          )}
          disabled={changing}
          aria-label="Change website language"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="z-[10000] max-h-[70vh] w-36 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#080d16] p-2 text-slate-300 shadow-2xl shadow-black/50"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => void changeLanguage(lang.code)}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold leading-none text-slate-300 focus:bg-white/[0.06] focus:text-white",
              currentCode === lang.code && "text-sky-300",
            )}
          >
            {lang.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
