"use client";

import { Button } from "@/components/ui/button";
import { X, Trash2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BulkAction {
  label: string;
  icon?: any;
  onClick: (selectedIds: string[]) => Promise<void> | void;
  variant?: "default" | "destructive" | "outline";
  className?: string;
  /** Confirm dialog text. If provided, shows confirm() before executing. */
  confirmText?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  className?: string;
}

/**
 * Sticky bulk action bar.
 * Shows when items are selected: "{count} dipilih" + action buttons + clear button.
 *
 * Usage:
 * {bulkSelectMode && selectedCount > 0 && (
 *   <BulkActionBar
 *     selectedCount={selectedCount}
 *     actions={[{ label: "Hapus Terpilih", icon: Trash2, onClick: handleBulkDelete, variant: "destructive", confirmText: "Hapus data terpilih?" }]}
 *     onClearSelection={clearSelection}
 *   />
 * )}
 */
export function BulkActionBar({ selectedCount, actions, onClearSelection, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkAction) => {
    if (action.confirmText) {
      if (!confirm(action.confirmText)) return;
    }
    // Get selected IDs from the action's onClick (we pass the IDs via closure in the parent)
    await action.onClick([]);
  };

  return (
    <div className={cn(
      "sticky top-0 z-20 bg-blue-600 text-white rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200",
      className
    )}>
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4" />
        <span className="text-sm font-medium">
          {selectedCount} data dipilih
        </span>
        <button
          onClick={onClearSelection}
          className="ml-2 p-1 hover:bg-blue-500 rounded transition-colors"
          title="Batalkan pilihan"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action, i) => (
          <Button
            key={i}
            size="sm"
            variant={action.variant === "destructive" ? "destructive" : action.variant === "outline" ? "outline" : "secondary"}
            className={cn(
              "h-8 text-xs",
              action.variant === "destructive" && "bg-rose-600 hover:bg-rose-700 text-white",
              action.variant === "outline" && "bg-white/10 text-white border-white/30 hover:bg-white/20",
              !action.variant && "bg-white text-blue-600 hover:bg-blue-50",
              action.className
            )}
            onClick={() => handleAction(action)}
          >
            {action.icon && <action.icon className="w-3.5 h-3.5 mr-1" />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
