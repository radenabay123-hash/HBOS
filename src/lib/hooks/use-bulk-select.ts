"use client";

import { useState, useCallback } from "react";

export interface UseBulkSelectOptions {
  // Get unique ID for each item
  getId: (item: any) => string;
}

/**
 * Reusable bulk selection hook for tables/lists.
 * Manages a Set of selected IDs with toggle, selectAll (visible), clearAll.
 * Call resetSelection() when filters change to clear stale selections.
 *
 * Usage:
 * const { selectedIds, isSelected, toggle, toggleAll, clearSelection, selectedCount, resetSelection } = useBulkSelect({ getId: (x) => x.id });
 */
export function useBulkSelect<T>({ getId }: UseBulkSelectOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getId(item));
  }, [selectedIds, getId]);

  const toggle = useCallback((item: T) => {
    const id = getId(item);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [getId]);

  const toggleById = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((items: T[]) => {
    setSelectedIds((prev) => {
      // If all visible items are selected, deselect them; otherwise select all
      const allSelected = items.length > 0 && items.every((item) => prev.has(getId(item)));
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((item) => next.delete(getId(item)));
      } else {
        items.forEach((item) => next.add(getId(item)));
      }
      return next;
    });
  }, [getId]);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(getId(item)));
      return next;
    });
  }, [getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

  const isAllSelected = useCallback((items: T[]) => {
    return items.length > 0 && items.every((item) => selectedIds.has(getId(item)));
  }, [selectedIds, getId]);

  const isSomeSelected = useCallback((items: T[]) => {
    return items.some((item) => selectedIds.has(getId(item))) && !isAllSelected(items);
  }, [selectedIds, getId, isAllSelected]);

  return {
    selectedIds,
    selectedArray: Array.from(selectedIds),
    selectedCount,
    isSelected,
    toggle,
    toggleById,
    toggleAll,
    selectAll,
    clearSelection,
    resetSelection,
    isAllSelected,
    isSomeSelected,
  };
}
