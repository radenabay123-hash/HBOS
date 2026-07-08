"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  pageSize?: number;
}

/**
 * Reusable Pagination component.
 * Shows: "Menampilkan X-Y dari Z" + First/Prev/Page numbers/Next/Last buttons.
 *
 * Usage:
 * <Pagination {...pageInfo} onPageChange={goToPage} onNext={nextPage} onPrev={prevPage} />
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNext,
  hasPrev,
  onPageChange,
  onNext,
  onPrev,
}: PaginationProps) {
  if (totalItems === 0) return null;

  // Generate page numbers to show (max 5 around current)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Menampilkan <strong className="text-slate-700">{startIndex}</strong>-
        <strong className="text-slate-700">{endIndex}</strong> dari{" "}
        <strong className="text-slate-700">{totalItems}</strong> data
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white"
          onClick={() => onPageChange(1)}
          disabled={!hasPrev}
          title="Halaman pertama"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white"
          onClick={onPrev}
          disabled={!hasPrev}
          title="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">...</span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                p === currentPage ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white"
              )}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white"
          onClick={onNext}
          disabled={!hasNext}
          title="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          title="Halaman terakhir"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
