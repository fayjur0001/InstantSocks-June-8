"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
// ✅ FIX Bug 1: dummy data সরিয়ে real API import করা হয়েছে
import { adminProxyApi, type RentalItem } from "@/lib/proxy.service";
import { toast } from "sonner";

// ─── Display type ─────────────────────────────────────────────────────────────
interface ProxyDisplay {
  id: string;
  ip: string;
  userName: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  port: string;
  type: string;
  note: string;
  status: "Active" | "Expired";
  bought: string;
  price: string;
  connectionString: string;
}

// ✅ FIX Bug 1: RentalItem → ProxyDisplay mapper
//    server থেকে আসা data-তে user field আছে (adminGetAllProxies এ join করা)
function toDisplay(r: RentalItem): ProxyDisplay {
  const createdAt = new Date(r.createdAt);
  const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isExpired = expiresAt < new Date();

  return {
    id: String(r.id),
    ip: r.ip,
    userName: r.user?.username ?? "-",
    country: r.country,
    state: r.state,
    city: r.city,
    zip: r.zip,
    port: r.port,
    type: r.type,
    note: (r.note && !r.note.startsWith("nsocks_history_id:")) ? r.note : "-",
    status: isExpired ? "Expired" : "Active",
    bought: new Date(r.createdAt).toLocaleString(),
    price: `$ ${r.price.toFixed(2)}`,
    connectionString: r.auth,
  };
}

interface ProxyFilters {
  ip: string;
  userName: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  port: string;
  note: string;
  type: string;
  status: string;
}

const TYPE_OPTIONS = [
  "ISP/MOB", "ISP", "MOB", "DCH", "COM",
  "GOV", "ORG", "EDU", "LIB", "CDN", "MIL", "SES", "-",
];

const headerInputCls = [
  "w-full min-w-[60px] bg-transparent border-none outline-none",
  "text-c-emerald-500 placeholder-emerald-500",
  "focus:placeholder-emerald-700 focus:text-white",
  "text-[12px] font-semibold cursor-pointer focus:cursor-text transition-colors duration-150",
].join(" ");

const FilterHeaderInput = ({
  placeholder, value, onChange,
}: { placeholder: string; value: string; onChange: (val: string) => void }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local); }, 600);
    return () => clearTimeout(t);
  }, [local, onChange, value]);
  return (
    <input
      className={headerInputCls}
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminSaleHistory() {
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProxy, setSelectedProxy] = useState<ProxyDisplay | null>(null);
  const [rentals, setRentals] = useState<ProxyDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<ProxyFilters>({
    ip: "", userName: "", country: "", state: "", city: "",
    zip: "", port: "", note: "", type: "", status: "",
  });

  const setFilter = useCallback((key: keyof ProxyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  // ✅ FIX Bug 1: mockProxyData সরিয়ে adminProxyApi.getAllRentals() দিয়ে
  //    সব user-এর real proxy purchase history load করা হচ্ছে
  const fetchRentals = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminProxyApi.getAllRentals(p, 20);
      if (res.success) {
        setRentals(res.transactions.map(toDisplay));
        setTotalItems(res.total);
      }
    } catch {
      toast.error("Failed to load sale history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRentals(page); }, [page, fetchRentals]);

  const filteredData = useMemo(() => {
    const m = (val: string, f: string) =>
      !f || val.toLowerCase().includes(f.toLowerCase());
    return rentals.filter((p) =>
      m(p.ip, filters.ip) &&
      m(p.userName, filters.userName) &&
      m(p.country, filters.country) &&
      m(p.state, filters.state) &&
      m(p.city, filters.city) &&
      m(p.zip, filters.zip) &&
      m(p.port, filters.port) &&
      m(p.note, filters.note) &&
      (!filters.type || p.type === filters.type) &&
      (!filters.status || p.status === filters.status)
    );
  }, [rentals, filters]);

  const columns = useMemo<ColumnDef<ProxyDisplay, unknown>[]>(
    () => [
      {
        accessorKey: "ip",
        header: () => <FilterHeaderInput placeholder="IP" value={filters.ip} onChange={(v) => setFilter("ip", v)} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-mono">
            <span>{row.original.ip}</span>
          </div>
        ),
      },
      {
        accessorKey: "userName",
        header: () => <FilterHeaderInput placeholder="USER NAME" value={filters.userName} onChange={(v) => setFilter("userName", v)} />,
        cell: ({ row }) => (
          <span className="text-c-slate-300">{row.original.userName}</span>
        ),
      },
      {
        accessorKey: "country",
        header: () => <FilterHeaderInput placeholder="COUNTRY" value={filters.country} onChange={(v) => setFilter("country", v)} />,
      },
      {
        accessorKey: "state",
        header: () => <FilterHeaderInput placeholder="STATE" value={filters.state} onChange={(v) => setFilter("state", v)} />,
      },
      {
        accessorKey: "city",
        header: () => <FilterHeaderInput placeholder="CITY" value={filters.city} onChange={(v) => setFilter("city", v)} />,
      },
      {
        accessorKey: "zip",
        header: () => <FilterHeaderInput placeholder="ZIP" value={filters.zip} onChange={(v) => setFilter("zip", v)} />,
      },
      {
        accessorKey: "port",
        header: () => <FilterHeaderInput placeholder="PORT" value={filters.port} onChange={(v) => setFilter("port", v)} />,
      },
      {
        accessorKey: "type",
        header: () => (
          <Select value={filters.type || "all"} onValueChange={(v) => setFilter("type", v === "all" ? "" : v)}>
            <SelectTrigger className="w-full bg-transparent border-none p-0 h-auto text-c-emerald-500 text-[12px] font-semibold hover:bg-transparent shadow-none focus:ring-0 [&>svg]:w-3 [&>svg]:h-3">
              <SelectValue placeholder="TYPE" />
            </SelectTrigger>
            <SelectContent className="bg-c-bg-850 border-c-emerald-900/30 text-c-slate-200">
              <SelectItem value="all">TYPE</SelectItem>
              {TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "note",
        header: () => <FilterHeaderInput placeholder="NOTE" value={filters.note} onChange={(v) => setFilter("note", v)} />,
      },
      {
        accessorKey: "status",
        header: () => (
          <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-full bg-transparent border-none p-0 h-auto text-c-emerald-500 text-[12px] font-semibold hover:bg-transparent shadow-none focus:ring-0 [&>svg]:w-3 [&>svg]:h-3">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="bg-c-bg-850 border-c-emerald-900/30 text-c-slate-200">
              <SelectItem value="all">STATUS</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        ),
        cell: ({ row }) => (
          <span className={row.original.status === "Active" ? "text-c-emerald-400 font-semibold text-[12px]" : "text-c-red-400 font-semibold text-[12px]"}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "bought",
        header: "BOUGHT",
        cell: ({ row }) => <span className="text-c-slate-400 text-[12px]">{row.original.bought}</span>,
      },
      {
        accessorKey: "price",
        header: "PRICE",
        cell: ({ row }) => <span className="text-c-emerald-400 font-semibold text-[12px]">{row.original.price}</span>,
      },
    ],
    [filters, setFilter]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 bg-black rounded-[16px] min-h-[80dvh] text-c-slate-300">

      {/* LEFT: Table */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-c-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading sale history…</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-c-slate-400">
              {rentals.length === 0 ? "No sales yet" : "No results match filters"}
            </p>
            {rentals.length > 0 && (
              <button
                onClick={() => setFilters({ ip: "", userName: "", country: "", state: "", city: "", zip: "", port: "", note: "", type: "", status: "" })}
                className="text-xs text-c-emerald-500 underline hover:text-c-emerald-400"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <ReusableTable
            columns={columns}
            data={filteredData}
            currentPage={page}
            setCurrentPage={setPage}
            itemsPerPage={20}
            totalItems={totalItems}
            onRowClick={(row) => setSelectedProxy(row)}
            selectedRowId={selectedProxy?.id}
            getRowId={(row) => row.id}
          />
        )}
      </div>

      {/* RIGHT: Detail Sidebar */}
      <div className="w-full lg:w-[250px] shrink-0 bg-c-bg-750 border border-c-slate-800 rounded-xl flex flex-col overflow-hidden">
        {!selectedProxy ? (
          <div className="p-4 text-sm text-c-slate-400">Click a row to view details.</div>
        ) : (
          <div className="p-5 flex flex-col h-full">
            <h3 className="text-sm text-c-slate-400 font-semibold tracking-wider mb-4">SOCKS5 PROXY</h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="font-mono text-c-slate-200 break-all">{selectedProxy.connectionString}</div>
              <div className="text-c-slate-300">
                {selectedProxy.country}, {selectedProxy.ip} {selectedProxy.state},{" "}
                {selectedProxy.city}, {selectedProxy.zip}
              </div>
              <div className="flex flex-col gap-1.5 mt-2 text-[12px]">
                <p><span className="text-c-slate-500 mr-2 uppercase">User:</span>{selectedProxy.userName}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase">Port:</span>{selectedProxy.port}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase">Type:</span>{selectedProxy.type}</p>
                <p>
                  <span className="text-c-slate-500 mr-2 uppercase">Status:</span>
                  <span className={selectedProxy.status === "Active" ? "text-c-emerald-400" : "text-c-red-400"}>
                    {selectedProxy.status}
                  </span>
                </p>
                <p><span className="text-c-slate-500 mr-2 uppercase">Bought:</span>{selectedProxy.bought}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase">Price:</span>{selectedProxy.price}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase">Note:</span>{selectedProxy.note}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}