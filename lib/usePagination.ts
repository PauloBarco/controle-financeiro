import { useState, useMemo } from "react";

interface UsePaginationOptions<TItem> {
  items: TItem[];
  itemsPerPage?: number;
}

interface PaginationState<TItem> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  paginatedItems: TItem[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

/**
 * Hook customizado para paginação
 * 
 * @example
 * const { paginatedItems, currentPage, totalPages, goToPage } = usePagination({
 *   items: lancamentos,
 *   itemsPerPage: 50
 * });
 */
export function usePagination<TItem>({
  items,
  itemsPerPage = 50,
}: UsePaginationOptions<TItem>): PaginationState<TItem> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Validar página atual
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedItems = useMemo(() => {
    const startIndex = (validPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, validPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => {
    goToPage(validPage + 1);
  };

  const goToPreviousPage = () => {
    goToPage(validPage - 1);
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const canGoNext = validPage < totalPages;
  const canGoPrevious = validPage > 1;

  return {
    currentPage: validPage,
    totalPages,
    totalItems,
    itemsPerPage,
    paginatedItems,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    canGoNext,
    canGoPrevious,
  };
}
