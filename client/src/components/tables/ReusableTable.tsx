"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import ReusablePagination from "./ReusablePagination";

interface ReusableTableProps<TData> {
  // Replaced 'any' with 'unknown' for proper strict typing
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  /** Pagination (optional) */
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  setCurrentPage?: React.Dispatch<React.SetStateAction<number>>;

  /** States */
  isLoading?: boolean;

  /** Selection & Interactivity */
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | number | null;
  getRowId?: (row: TData) => string | number;

  /** Optional wrappers */
  className?: string;
}

export function ReusableTable<TData>({
  columns,
  data,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  totalItems,
  isLoading = false,
  onRowClick,
  selectedRowId,
  getRowId,
  className = "",
}: ReusableTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  console.log("total items:", totalItems);

  const footerGroups = table.getFooterGroups();
  const hasFooterContent = footerGroups.some((group) =>
    group.headers.some((header) => !!header.column.columnDef.footer)
  );

  return (
    <div
      className={`w-full overflow-hidden bg-black border border-c-emerald-900/20 rounded-xl flex flex-col justify-between ${className}`}
    >
      {/* ================= TABLE ================= */}
      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-c-emerald-900/10 border-b border-c-emerald-900/20 hover:bg-c-emerald-900/10"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="px-4 py-3 text-c-emerald-500 text-[12px] font-semibold whitespace-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody className="max-h-[70dvh] overflow-auto">
          {/* Loading */}
          {isLoading && (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-8">
                <div className="flex justify-center items-center gap-3">
                  <div className="w-5 h-5 border-2 border-c-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-c-slate-400 font-medium">
                    Loading...
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Data */}
          {!isLoading &&
            table.getRowModel().rows.length > 0 &&
            table.getRowModel().rows.map((row) => {
              // Check if the current row is selected
              const isSelected =
                getRowId && selectedRowId !== undefined
                  ? getRowId(row.original) === selectedRowId
                  : false;

              return (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`transition border-b border-c-emerald-900/10 ${onRowClick ? "cursor-pointer" : ""
                    } ${isSelected
                      ? "bg-c-green-700 hover:bg-c-green-700" // Green background for selected row
                      : "bg-transparent hover:bg-c-emerald-900/5"
                    }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-4 py-3 text-[12px] ${isSelected ? "text-white" : "text-c-slate-300"
                        }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}

          {/* Empty */}
          {!isLoading && table.getRowModel().rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="p-8 text-center text-c-slate-400 italic"
              >
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>

        {/* ================= FOOTER ================= */}
        {hasFooterContent && (
          <TableFooter className="bg-c-emerald-900/10 hover:bg-c-emerald-900/10 text-c-emerald-500 border-green/20">
            {footerGroups.map((footerGroup) => (
              <TableRow key={footerGroup.id} className="hover:bg-transparent">
                {footerGroup.headers.map((footer) => (
                  <TableCell key={footer.id} className="px-4 py-3 bg-c-emerald-900/10 text-c-emerald-500">
                    {flexRender(
                      footer.column.columnDef.footer,
                      footer.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        )}
      </Table>

      {/* ================= PAGINATION ================= */}
      {totalItems !== undefined &&
        itemsPerPage !== undefined &&
        currentPage !== undefined &&
        setCurrentPage !== undefined &&
        totalItems > itemsPerPage && (
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <ReusablePagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              maxVisiblePages={3}
            />
          </div>
        )}
    </div>
  );
}