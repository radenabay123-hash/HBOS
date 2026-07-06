"use client";

import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsePaginationOptions {
  pageSize?: number; // default 15
  initialPage?: number; // default 1
}

/**
 * Reusable pagination hook.
 * Clamps currentPage to valid range when totalItems changes (no effect needed).
 *
 * Usage:
 * const { page, pageSize, totalPages, paginatedItems, goToPage, nextPage, prevPage, pageInfo } = usePagination(items, { pageSize: 15 });
 */
export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 15, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page to valid range (avoids effect-induced re-render)
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, safePage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const pageInfo: PaginationState = {
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };

  return {
    page: safePage,
    pageSize,
    paginatedItems,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    pageInfo,
  };
}
