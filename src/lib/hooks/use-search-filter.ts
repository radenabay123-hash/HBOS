"use client";

import { useState, useMemo, useCallback } from "react";

export interface FilterField<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "select" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface UseSearchFilterOptions<T> {
  // Fields to search (text match, case-insensitive)
  searchFields: (keyof T)[];
  // Additional filter fields (dropdown/date)
  filterFields?: FilterField<T>[];
  initialQuery?: string;
}

/**
 * Reusable search + filter hook.
 * Combines a free-text search box with structured filter dropdowns/dates.
 *
 * Usage:
 * const { query, setQuery, filters, setFilter, filtered } = useSearchFilter(items, { searchFields: ["name", "email"] });
 */
export function useSearchFilter<T>(items: T[], options: UseSearchFilterOptions<T>) {
  const { searchFields, filterFields = [], initialQuery = "" } = options;
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setFilters({});
  }, []);

  const filtered = useMemo(() => {
    let result = items;

    // Apply free-text search
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // Apply structured filters
    for (const field of filterFields) {
      const filterValue = filters[field.key];
      if (filterValue) {
        result = result.filter((item) => {
          const val = item[field.key];
          if (val == null) return false;
          if (field.type === "date") {
            const itemDate = new Date(String(val)).toISOString().slice(0, 10);
            return itemDate === filterValue;
          }
          return String(val) === filterValue;
        });
      }
    }

    return result;
  }, [items, query, filters, searchFields, filterFields]);

  const hasActiveFilters = query.trim() !== "" || Object.values(filters).some((v) => v);

  return {
    query,
    setQuery,
    filters,
    setFilter,
    clearFilters,
    filtered,
    hasActiveFilters,
  };
}
