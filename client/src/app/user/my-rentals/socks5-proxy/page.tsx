"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { proxyApi, type RentalItem } from "@/lib/proxy.service";
import { toFlagEmoji } from "@/lib/helpers";
import { toast } from "sonner";

// ─── Display type ─────────────────────────────────────────────────────────────
export interface ProxyDisplay {
  id: string;
  _rawId: number;
  ip: string;
  proxyPort: string;       // NSocks proxy port (e.g. 33494)
  country: string;
  state: string;
  city: string;
  zip: string;
  port: string;            // internal tracking port
  type: string;
  note: string;
  status: "Active" | "Offline" | "Expired";
  bought: string;
  price: string;
  connectionString: string;
}

// ─── Map API RentalItem → ProxyDisplay ───────────────────────────────────────
function toDisplay(r: RentalItem): ProxyDisplay {
  const createdAt = new Date(r.createdAt);
  const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isExpired = expiresAt < new Date();

  // ip field = "ip:port" combined (e.g. "123.0.220.210:33494") — split করে আলাদা দেখাই
  const [proxyIp, proxyPort] = r.ip.includes(":")
    ? r.ip.split(":")
    : [r.ip, ""];

  // NSocks online status থাকলে সেটা use করো, নাহলে 30-day fallback
  const nsocksOnline = r.nsocksOnline;
  const status: "Active" | "Offline" | "Expired" =
    nsocksOnline === 1 ? "Active"  :
    nsocksOnline === 0 ? "Offline" :
    isExpired          ? "Expired" : "Active";

  return {
    id: String(r.id),
    _rawId: r.id,
    ip: proxyIp,           // শুধু IP
    proxyPort: proxyPort,  // NSocks proxy port (33494)
    country: r.country,
    state: r.state,
    city: r.city,
    zip: r.zip,
    port: r.port,          // internal tracking port
    type: r.type,
    note: r.note || "-",
    status,
    bought: new Date(r.createdAt).toLocaleString(),
    price: `$ ${r.price.toFixed(2)}`,
    connectionString: r.auth && r.ip ? `socks5://${r.auth}@${r.ip}` : r.auth,
  };
}

interface ProxyFilters {
  ip: string;
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
  "text-[12px] font-semibold",
  "cursor-pointer focus:cursor-text",
  "transition-colors duration-150",
].join(" ");

const FilterHeaderInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => { setLocalValue(value); }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) onChange(localValue);
    }, 600);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <input
      className={headerInputCls}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProxyDashboard() {
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProxy, setSelectedProxy] = useState<ProxyDisplay | null>(null);
  const [rentals, setRentals] = useState<ProxyDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<number | null>(null);

  const [filters, setFilters] = useState<ProxyFilters>({
    ip: "", country: "", state: "", city: "",
    zip: "", port: "", note: "", type: "", status: "",
  });

  const setFilter = useCallback((key: keyof ProxyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  // ── Fetch rentals ─────────────────────────────────────────────────────────
  const fetchRentals = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await proxyApi.getMyRentals(p, 20);
      if (res.success) {
        setRentals(res.rentals.map(toDisplay));
        setTotalItems(res.total);
      }
    } catch {
      toast.error("Failed to load rentals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRentals(page); }, [page, fetchRentals]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const m = (val: string, f: string) =>
      !f || val.toLowerCase().includes(f.toLowerCase());
    return rentals.filter((p) =>
      m(p.ip, filters.ip) &&
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

  // ── Renew ─────────────────────────────────────────────────────────────────
  const handleRenew = async (proxy: ProxyDisplay) => {
    setRenewingId(proxy._rawId);
    try {
      const res = await proxyApi.renew(proxy._rawId);
      if (res.success) {
        toast.success("Proxy renewed successfully!");
        fetchRentals(page);
      } else {
        toast.error("Renewal failed. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("402") || msg.includes("Insufficient")) {
        toast.error("Insufficient balance. Please top up.");
      } else {
        toast.error("Renewal failed. Please try again.");
      }
    } finally {
      setRenewingId(null);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ProxyDisplay, unknown>[]>(
    () => [
      {
        accessorKey: "ip",
        header: () => (
          <FilterHeaderInput
            placeholder="IP"
            value={filters.ip}
            onChange={(val) => setFilter("ip", val)}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[14px] leading-none">
              {toFlagEmoji(row.original.country?.slice(0, 2).toUpperCase() || "US")}
            </span>
            <span>{row.original.ip}</span>
          </div>
        ),
      },
      {
        accessorKey: "country",
        header: () => (
          <FilterHeaderInput
            placeholder="COUNTRY"
            value={filters.country}
            onChange={(val) => setFilter("country", val)}
          />
        ),
      },
      {
        accessorKey: "state",
        header: () => (
          <FilterHeaderInput
            placeholder="STATE"
            value={filters.state}
            onChange={(val) => setFilter("state", val)}
          />
        ),
      },
      {
        accessorKey: "city",
        header: () => (
          <FilterHeaderInput
            placeholder="CITY"
            value={filters.city}
            onChange={(val) => setFilter("city", val)}
          />
        ),
      },
      {
        accessorKey: "zip",
        header: () => (
          <FilterHeaderInput
            placeholder="ZIP"
            value={filters.zip}
            onChange={(val) => setFilter("zip", val)}
          />
        ),
      },
      {
        accessorKey: "port",
        header: () => (
          <FilterHeaderInput
            placeholder="PORT"
            value={filters.port}
            onChange={(val) => setFilter("port", val)}
          />
        ),
      },
      {
        accessorKey: "type",
        header: () => (
          <Select
            value={filters.type || "all"}
            onValueChange={(val) => setFilter("type", val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-full bg-transparent border-none p-0 h-auto text-c-emerald-500 text-[12px] font-semibold hover:bg-transparent shadow-none focus:ring-0 [&>svg]:w-3 [&>svg]:h-3">
              <SelectValue placeholder="TYPE" />
            </SelectTrigger>
            <SelectContent className="bg-c-bg-850 border-c-emerald-900/30 text-c-slate-200">
              <SelectItem value="all">TYPE</SelectItem>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "note",
        header: () => (
          <FilterHeaderInput
            placeholder="NOTE"
            value={filters.note}
            onChange={(val) => setFilter("note", val)}
          />
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <Select
            value={filters.status || "all"}
            onValueChange={(val) => setFilter("status", val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-full bg-transparent border-none p-0 h-auto text-c-emerald-500 text-[12px] font-semibold hover:bg-transparent shadow-none focus:ring-0 [&>svg]:w-3 [&>svg]:h-3">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="bg-c-bg-850 border-c-emerald-900/30 text-c-slate-200">
              <SelectItem value="all">STATUS</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.status === "Active"
                ? "text-c-emerald-400 font-semibold text-[12px]"
                : row.original.status === "Offline"
                ? "text-c-amber-400 font-semibold text-[12px]"
                : "text-c-red-400 font-semibold text-[12px]"
            }
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "bought",
        header: "BOUGHT",
        cell: ({ row }) => (
          <span className="text-c-slate-400 text-[12px]">{row.original.bought}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "PRICE",
        cell: ({ row }) => (
          <span className="text-c-emerald-400 font-semibold text-[12px]">
            {row.original.price}
          </span>
        ),
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
            <span className="text-sm">Loading rentals…</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg
              width="36" height="36" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              className="text-c-emerald-900"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p className="text-sm font-medium text-c-slate-400">
              {rentals.length === 0
                ? "You have no proxy rentals yet"
                : "No proxies match your filters"}
            </p>
            {rentals.length > 0 && (
              <button
                onClick={() =>
                  setFilters({
                    ip: "", country: "", state: "", city: "",
                    zip: "", port: "", note: "", type: "", status: "",
                  })
                }
                className="mt-1 text-xs text-c-emerald-500 underline hover:text-c-emerald-400"
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
          <div className="p-4 text-sm text-c-slate-400">
            Click a proxy to view info.
          </div>
        ) : (
          <div className="p-5 flex flex-col h-full">
            <h3 className="text-sm text-c-slate-400 font-semibold tracking-wider mb-4">
              SOCKS5 PROXY
            </h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="font-mono text-c-slate-200 break-all">
                {selectedProxy.connectionString}
              </div>
              <div className="text-c-slate-300">
                {selectedProxy.country},{" "}
                {selectedProxy.ip} {selectedProxy.state},{" "}
                {selectedProxy.city}, {selectedProxy.zip}
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Proxy IP:</span>{selectedProxy.ip}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Proxy Port:</span>{selectedProxy.proxyPort || "-"}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Internal Port:</span>{selectedProxy.port}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Type:</span>{selectedProxy.type}</p>
                <p>
                  <span className="text-c-slate-500 mr-2 uppercase text-[11px]">Status:</span>
                  <span className={
                    selectedProxy.status === "Active"  ? "text-c-emerald-400" :
                    selectedProxy.status === "Offline" ? "text-c-amber-400"   :
                                                         "text-c-red-400"
                  }>
                    {selectedProxy.status}
                  </span>
                </p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Bought:</span>{selectedProxy.bought}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Price:</span>{selectedProxy.price}</p>
                <p><span className="text-c-slate-500 mr-2 uppercase text-[11px]">Note:</span>{selectedProxy.note}</p>
              </div>
            </div>

            {/* Renew Action */}
            <div className="mt-auto pt-6">
              <Button
                variant="default"
                disabled={renewingId === selectedProxy._rawId}
                onClick={() => handleRenew(selectedProxy)}
                className="w-full bg-c-emerald-600 hover:bg-c-emerald-700 disabled:opacity-60 text-white font-semibold flex items-center gap-2"
              >
                {renewingId === selectedProxy._rawId && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <RefreshCw size={14} />
                Renew
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}