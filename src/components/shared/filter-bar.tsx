"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X, Search, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterField } from "@/lib/hooks/use-search-filter";

interface FilterBarProps<T> {
  query: string;
  onQueryChange: (q: string) => void;
  searchPlaceholder?: string;
  filters?: FilterField<T>[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  /** When provided, shows a "Pilih Beberapa" toggle button instead of always-visible checkboxes.
   *  Click to enter bulk-select mode, click again to exit.
   */
  bulkSelectMode?: boolean;
  onToggleBulkSelect?: () => void;
  showBulkSelectButton?: boolean;
}

/**
 * Reusable search + filter bar.
 * Includes: search input, optional filter dropdowns/dates, clear button.
 * Also includes optional "Pilih Beberapa" toggle for bulk-select mode.
 */
export function FilterBar<T>({
  query,
  onQueryChange,
  searchPlaceholder = "Cari...",
  filters = [],
  filterValues = {},
  onFilterChange,
  onClear,
  hasActiveFilters = false,
  bulkSelectMode = false,
  onToggleBulkSelect,
  showBulkSelectButton = false,
}: FilterBarProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 bg-white text-sm"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter dropdowns/dates */}
      {filters.map((f) => (
        <div key={f.key} className="min-w-[140px]">
          {f.type === "select" ? (
            <select
              value={filterValues[f.key] || ""}
              onChange={(e) => onFilterChange?.(f.key, e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{f.label}: Semua</option>
              {f.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : f.type === "date" ? (
            <Input
              type="date"
              value={filterValues[f.key] || ""}
              onChange={(e) => onFilterChange?.(f.key, e.target.value)}
              className="h-9 bg-white text-sm"
            />
          ) : (
            <Input
              type="text"
              value={filterValues[f.key] || ""}
              onChange={(e) => onFilterChange?.(f.key, e.target.value)}
              placeholder={f.placeholder || f.label}
              className="h-9 bg-white text-sm"
            />
          )}
        </div>
      ))}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onClear}>
          <X className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      )}

      {/* Bulk select toggle */}
      {showBulkSelectButton && onToggleBulkSelect && (
        <Button
          variant={bulkSelectMode ? "default" : "outline"}
          size="sm"
          className={cn("h-9 text-xs", bulkSelectMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
          onClick={onToggleBulkSelect}
        >
          <FilterIcon className="w-3.5 h-3.5 mr-1" />
          {bulkSelectMode ? "Selesai Pilih" : "Pilih Beberapa"}
        </Button>
      )}
    </div>
  );
}

/** Checkbox cell for table rows */
export function SelectCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
    />
  );
}
