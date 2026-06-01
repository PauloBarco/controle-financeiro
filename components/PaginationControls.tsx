import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onGoToPage: (page: number) => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  onGoToFirst: () => void;
  onGoToLast: () => void;
}

/**
 * Componente de controle de paginação
 * Mostra: página atual, total de páginas, botões de navegação
 */
export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  canGoNext,
  canGoPrevious,
  onGoToPage,
  onGoToNext,
  onGoToPrevious,
  onGoToFirst,
  onGoToLast,
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
      {/* Informações de registros */}
      <div className="text-sm text-gray-600">
        Mostrando{" "}
        <span className="font-semibold text-gray-900">
          {startItem} até {endItem}
        </span>{" "}
        de{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span> registros
        ({itemsPerPage} por página)
      </div>

      {/* Controles de navegação */}
      <div className="flex flex-wrap gap-2 sm:gap-1">
        {/* Primeira página */}
        <button
          onClick={onGoToFirst}
          disabled={!canGoPrevious}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          title="Ir para primeira página"
        >
          ⟨⟨
        </button>

        {/* Página anterior */}
        <button
          onClick={onGoToPrevious}
          disabled={!canGoPrevious}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          title="Página anterior"
        >
          ⟨
        </button>

        {/* Indicador de página */}
        <div className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded">
          Página{" "}
          <span className="font-semibold">
            {currentPage}/{totalPages}
          </span>
        </div>

        {/* Próxima página */}
        <button
          onClick={onGoToNext}
          disabled={!canGoNext}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          title="Próxima página"
        >
          ⟩
        </button>

        {/* Última página */}
        <button
          onClick={onGoToLast}
          disabled={!canGoNext}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          title="Ir para última página"
        >
          ⟩⟩
        </button>
      </div>

      {/* Navegação rápida por página */}
      <div className="flex items-center gap-2">
        <label htmlFor="page-select" className="text-sm text-gray-600">
          Ir para:
        </label>
        <select
          id="page-select"
          value={currentPage}
          onChange={(e) => onGoToPage(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
