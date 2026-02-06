'use client';

import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import React from 'react';

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CustomPagination({
  currentPage,
  totalPages,
  onPageChange,
}: CustomPaginationProps) {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);

  const getPageNumbers = React.useMemo(() => {
    const pages: (number | '…')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('…');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full w-8 h-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
        </PaginationItem>

        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full w-8 h-8"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
        </PaginationItem>

        {getPageNumbers.map((p, idx) => (
          <PaginationItem key={`${p}-${idx}`}>
            {p === '…' ? (
              <span className="w-10 h-10 flex items-center justify-center text-xl">
                …
              </span>
            ) : (
              <Button
                type="button"
                className={`rounded-full w-8 h-8 ${
                  p === currentPage ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: p === currentPage ? primaryColor : undefined,
                }}
                variant={p === currentPage ? 'default' : 'ghost'}
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </Button>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full w-8 h-8"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </PaginationItem>

        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full w-8 h-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
