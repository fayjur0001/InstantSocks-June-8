"use client";

import { useState, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { ColumnDef } from "@tanstack/react-table";
import { dashboardApi, ProxyTransaction } from "@/lib/dashboard.service";

const ITEMS_PER_PAGE = 20;

// Country code → flag emoji
function flagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(
    ...code.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 bg-zinc-800 rounded" />
      ))}
    </div>
  );
}

export default function ProxyTable() {
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [inputVal,   setInputVal]   = useState("");
  const [data,       setData]       = useState<ProxyTransaction[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await dashboardApi.getProxyTransactions(page, ITEMS_PER_PAGE, search);
      if (res.success) {
        setData(res.data.transactions);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search: debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(inputVal);
    }, 400);
    return () => clearTimeout(t);
  }, [inputVal]);

  const columns: ColumnDef<ProxyTransaction>[] = [
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" title={row.original.country}>
            {flagEmoji(row.original.country)}
          </span>
          <span className="text-c-slate-200 font-mono text-sm">{row.original.ip}</span>
        </div>
      ),
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => <span className="text-c-slate-200">{row.original.country}</span>,
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => <span className="text-c-slate-200">{row.original.state}</span>,
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => <span className="text-c-slate-200">{row.original.city}</span>,
    },
    {
      accessorKey: "zip",
      header: "ZIP",
      cell: ({ row }) => <span className="text-c-slate-300 text-sm">{row.original.zip}</span>,
    },
    {
      accessorKey: "port",
      header: "Port",
      cell: ({ row }) => <span className="text-c-slate-300 font-mono text-sm">{row.original.port}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-xs bg-c-bg-600 border border-c-slate-700 px-2 py-0.5 rounded text-c-slate-300">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: "note",
      header: "Note",
      cell: ({ row }) => <span className="text-c-slate-400 text-sm">{row.original.note}</span>,
    },
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => <span className="text-c-slate-300 text-sm">{row.original.username}</span>,
    },
    {
      accessorKey: "bought",
      header: "Bought",
      cell: ({ row }) => (
        <span className="text-c-slate-300 text-sm">
          {new Date(row.original.bought).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="text-c-orange-500 font-medium">$ {row.original.price.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by IP, country or username..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="w-full max-w-sm bg-black border border-c-slate-700 rounded-md px-3 py-1.5 text-sm text-c-slate-200 placeholder:text-c-slate-500 focus:outline-none focus:border-c-green-500"
        />
        {!loading && (
          <span className="text-xs text-c-slate-500 whitespace-nowrap">
            {total} total
          </span>
        )}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-c-slate-400">
          <span>Failed to load proxy transactions.</span>
          <button
            onClick={fetchData}
            className="text-xs text-c-green-500 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <ReusableTable
          columns={columns}
          data={data}
          currentPage={page}
          setCurrentPage={setPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={total}
        />
      )}
    </div>
  );
}