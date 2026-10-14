"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info, X } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

interface ConfigOption {
  value: any;
  label: string;
  tooltip: string;
  type: string;
  placeholder?: string;
  values?: Array<{ value: number | string; label: string }>;
}

interface ConfigOptionCardProps {
  category: string;
  optionKey: string;
  option: ConfigOption;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function ConfigOptionCardComponent({
  category,
  optionKey,
  option,
  onChange,
  disabled,
}: ConfigOptionCardProps) {
  const [newItem, setNewItem] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const MAX_CHARACTERS = 100000;

  const clearError = useCallback(() => {
    if (errorMessage) {
      setErrorMessage("");
    }
  }, [errorMessage]);

  const processItems = useCallback(
    (items: string[]) => {
      const validItems = items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .filter(
          (item) =>
            !option.value.some(
              (existingItem: string) =>
                existingItem.toLowerCase() === item.toLowerCase()
            )
        );

      const uniqueItems = validItems.filter(
        (item, index, array) =>
          array.findIndex(
            (otherItem) => otherItem.toLowerCase() === item.toLowerCase()
          ) === index
      );

      return uniqueItems;
    },
    [option.value]
  );

  const handleAddItems = useCallback(
    (items: string[]) => {
      const processedItems = processItems(items);
      const currentCharCount = option.value.join("").length;
      const newCharCount = processedItems.join("").length;
      const totalCharactersAfterAdd = currentCharCount + newCharCount;

      if (totalCharactersAfterAdd > MAX_CHARACTERS) {
        const remainingCharacters = MAX_CHARACTERS - currentCharCount;
        setErrorMessage(
          `Cannot add items. Limit of ${MAX_CHARACTERS.toLocaleString()} characters exceeded.`
        );
        return;
      }

      if (processedItems.length > 0) {
        onChange([...option.value, ...processedItems]);
        clearError();
      }
    },
    [processItems, option.value, onChange, clearError]
  );

  const handleAddItem = useCallback(() => {
    const trimmedItem = newItem.trim();
    if (trimmedItem) {
      handleAddItems([trimmedItem]);
      setNewItem("");
    }
  }, [newItem, handleAddItems]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const items = pastedText
        .split(/[,\n\r]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (items.length > 1) {
        handleAddItems(items);
        setNewItem("");
      } else {
        setNewItem(pastedText.trim());
      }
    },
    [handleAddItems]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const trimmedItem = newItem.trim();
        if (trimmedItem) {
          handleAddItems([trimmedItem]);
          setNewItem("");
        }
      }
    },
    [newItem, handleAddItems]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewItem(e.target.value);
      clearError();
    },
    [clearError]
  );

  const handleStringChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      onChange(checked);
    },
    [onChange]
  );

  const handleRemoveItem = useCallback(
    (idx: number) => {
      onChange(option.value.filter((_: string, i: number) => i !== idx));
      clearError();
    },
    [onChange, option.value, clearError]
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
    clearError();
  }, [onChange, clearError]);

  const handleSelectAllItems = useCallback(() => {
    onChange((option.values || []).map((v: any) => v.value));
  }, [onChange, option.values]);

  const handleSelectNoItems = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleToggleItem = useCallback(
    (itemValue: any, isSelected: boolean) => {
      if (isSelected) {
        onChange(option.value.filter((v: any) => v !== itemValue));
      } else {
        onChange([...option.value, itemValue]);
      }
    },
    [onChange, option.value]
  );

  const handleSelectChange = useCallback(
    (value: string) => {
      if (value === "all") {
        handleSelectAllItems();
      } else if (value === "none") {
        handleSelectNoItems();
      }
    },
    [handleSelectAllItems, handleSelectNoItems]
  );

  const renderInput = useMemo(() => {
    switch (option.type) {
      case "boolean":
        return (
          <div className="flex items-center justify-end">
            <Switch
              id={`${category}-${optionKey}`}
              checked={option.value}
              onCheckedChange={handleSwitchChange}
              disabled={disabled}
            />
          </div>
        );

      case "string":
        return (
          <div className="pt-1 pb-2 px-3">
            <Input
              id={`${category}-${optionKey}`}
              value={option.value}
              onChange={handleStringChange}
              placeholder={option.placeholder || ""}
              disabled={disabled}
              className="w-full bg-zinc-900/60 border-zinc-800 focus:border-cyan-500"
            />
          </div>
        );

      case "number":
        return (
          <div className="pt-1 pb-2 px-3">
            <Input
              id={`${category}-${optionKey}`}
              type="number"
              value={option.value}
              onChange={handleNumberChange}
              disabled={disabled}
              className="w-full bg-zinc-900/60 border-zinc-800 focus:border-cyan-500"
            />
          </div>
        );

      case "list":
        return (
          <div className="p-3">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <Input
                  value={newItem}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  placeholder={option.placeholder || "Add item or paste comma separated..."}
                  className="flex-1 bg-zinc-900/60 border-zinc-800 focus:border-cyan-500"
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={disabled}
                  className="border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={disabled || !Array.isArray(option.value) || option.value.length === 0}
                  className="border-zinc-800 hover:bg-zinc-800 text-rose-400"
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {Array.isArray(option.value) ? option.value.length : 0} items
                </span>
                {errorMessage && (
                  <span className="text-rose-400">{errorMessage}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-1">
                {!Array.isArray(option.value) || option.value.length === 0 ? (
                  <span className="text-sm text-zinc-500 italic">
                    No items added
                  </span>
                ) : (
                  option.value.map((item: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800/80 text-zinc-200 border border-zinc-700/50"
                    >
                      {item}
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="ml-1 rounded-full hover:text-rose-400"
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-xs text-zinc-500 p-2">Option type: {option.type}</div>;
    }
  }, [
    category,
    disabled,
    errorMessage,
    handleAddItem,
    handleClearAll,
    handleInputChange,
    handleKeyDown,
    handleNumberChange,
    handlePaste,
    handleRemoveItem,
    handleStringChange,
    handleSwitchChange,
    newItem,
    option,
    optionKey,
  ]);

  const renderTooltip = useCallback(
    (content: string) => (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center justify-center"
              aria-label="More information"
              onClick={(e) => e.preventDefault()}
            >
              <Info className="h-3.5 w-3.5 text-zinc-500 hover:text-cyan-400 transition-colors cursor-help flex-shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
            sideOffset={5}
          >
            {content}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    []
  );

  if (option.type === "boolean") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3.5 px-4 border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-900/40 transition-colors rounded-lg",
          disabled && "opacity-60"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Label
            htmlFor={`${category}-${optionKey}`}
            className="font-medium cursor-pointer truncate text-sm text-zinc-200"
          >
            {option.label}
          </Label>
          {renderTooltip(option.tooltip)}
        </div>
        {renderInput}
      </div>
    );
  }

  return (
    <div className={cn("border-b border-zinc-800/60 last:border-b-0 p-1", disabled && "opacity-60")}>
      <div className="p-3 pb-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-zinc-200">{option.label}</h4>
          {renderTooltip(option.tooltip)}
        </div>
      </div>
      {renderInput}
    </div>
  );
}

export const ConfigOptionCard = React.memo(ConfigOptionCardComponent);
