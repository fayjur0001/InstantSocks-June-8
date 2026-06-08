import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ReusablePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

const ReusablePagination: React.FC<ReusablePaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  /** Generate visible page numbers */
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("ellipsis-left");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("ellipsis-right");
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className="mt-full justify-end">
      <PaginationContent className="flex-wrap justify-between w-full">
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            className={`${
              currentPage === 1 ? "pointer-events-none text-c-slate-600 opacity-50" : "text-c-slate-300 hover:text-white hover:bg-c-emerald-500/10"
            }`}
          />
        </PaginationItem>
        <div className="flex flex-wrap sm:flex-nowrap gap-0.5">
          {/* Page Numbers */}
          {pageNumbers.map((page, index) => (
            <PaginationItem className="" key={index}>
              {typeof page === "number" ? (
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)}
                  className={`cursor-pointer border-0 shadow-none transition-colors ${page === currentPage ? "bg-c-green-500 text-white" : "text-c-slate-400 hover:bg-c-emerald-500/10 hover:text-white"}`}
                >
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis className="text-c-slate-600" />
              )}
            </PaginationItem>
          ))}
        </div>

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            className={`text-c-slate-300 hover:text-white hover:bg-c-emerald-500/10 ${
              currentPage === totalPages ? "pointer-events-none text-c-slate-600 opacity-50" : ""
            }`}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default ReusablePagination;
