"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ReusableTable } from "@/components/tables/ReusableTable";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { FilterState, ProxyItem } from "@/types/admin/socks5-proxy-ips";
import FilterHeaderInput from "./FilterHeaderInput";


const TYPE_OPTIONS = [
    "ISP/MOB", "ISP", "MOB", "DCH", "COM", "GOV", "ORG", "EDU", "LIB", "CDN", "MIL", "SES", "-",
];

const EMPTY_FILTERS: FilterState = {
    ip: "", domain: "", state: "", city: "", isp: "", zip: "", type: "",
};

interface ProxyTableProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    setFilter: (key: keyof FilterState, val: string) => void;
    filteredProxies: ProxyItem[];
    selectedProxy: ProxyItem | null;
    setSelectedProxy: React.Dispatch<React.SetStateAction<ProxyItem | null>>;
    cart: ProxyItem[];
    addToCart: (proxy: ProxyItem) => void;
    // ── নতুন props — parent থেকে pagination control করার জন্য ──
    totalItems: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    isLoading?: boolean;
}

function ProxyTable({
    filters,
    setFilters,
    setFilter,
    filteredProxies,
    selectedProxy,
    setSelectedProxy,
    cart,
    addToCart,
    totalItems,
    currentPage,
    setCurrentPage,
    isLoading = false,
}: ProxyTableProps) {
    // ✅ internal page state সরানো হয়েছে — parent control করবে

    const columns = useMemo<ColumnDef<ProxyItem, unknown>[]>(
        () => [
            {
                accessorKey: "ip",
                header: () => (
                    <FilterHeaderInput
                        placeholder="IP"
                        value={filters.ip}
                        onChange={(v) => setFilter("ip", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="flex items-center gap-2 font-mono text-[12px]">
                        <img src={`https://flagcdn.com/20x15/${row.original.countryCode.toLowerCase()}.png`} width={20} height={15} alt={row.original.countryCode} />
                        <span className="text-c-slate-200">{row.original.ip}</span>
                    </span>
                ),
            },
            {
                accessorKey: "domain",
                header: () => (
                    <FilterHeaderInput
                        placeholder="DOMAIN"
                        value={filters.domain}
                        onChange={(v) => setFilter("domain", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px] font-mono">
                        {row.original.domain}
                    </span>
                ),
            },
            {
                accessorKey: "state",
                header: () => (
                    <FilterHeaderInput
                        placeholder="STATE"
                        value={filters.state}
                        onChange={(v) => setFilter("state", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px]">{row.original.state}</span>
                ),
            },
            {
                accessorKey: "city",
                header: () => (
                    <FilterHeaderInput
                        placeholder="CITY"
                        value={filters.city}
                        onChange={(v) => setFilter("city", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px]">{row.original.city}</span>
                ),
            },
            {
                accessorKey: "isp",
                header: () => (
                    <FilterHeaderInput
                        placeholder="ISP"
                        value={filters.isp}
                        onChange={(v) => setFilter("isp", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px]">{row.original.isp}</span>
                ),
            },
            {
                accessorKey: "zip",
                header: () => (
                    <FilterHeaderInput
                        placeholder="ZIP"
                        value={filters.zip}
                        onChange={(v) => setFilter("zip", v)}
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px]">{row.original.zip}</span>
                ),
            },
            {
                accessorKey: "speed",
                header: "SPEED",
                cell: ({ row }) => (
                    <span className="text-c-slate-300 text-[12px]">↑ {row.original.speed}</span>
                ),
            },
            {
                accessorKey: "ping",
                header: "PING",
                cell: ({ row }) => (
                    <span className="text-c-slate-300 text-[12px]">{row.original.ping}</span>
                ),
            },
            {
                accessorKey: "type",
                header: () => (
                    <Select
                        value={filters.type || "all"}
                        onValueChange={(v) => setFilter("type", v === "all" ? "" : v)}
                    >
                        <SelectTrigger className="w-full bg-transparent border-none p-0 h-auto text-c-emerald-500 text-[12px] font-semibold hover:bg-transparent shadow-none focus:ring-0 [&>svg]:w-3 [&>svg]:h-3">
                            <SelectValue placeholder="TYPE" />
                        </SelectTrigger>
                        <SelectContent className="bg-c-bg-850 border-c-emerald-900/30 text-c-slate-200">
                            <SelectItem value="all">TYPE</SelectItem>
                            {TYPE_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ),
                cell: ({ row }) => (
                    <span className="text-c-slate-300 text-[12px]">{row.original.type}</span>
                ),
            },
            {
                accessorKey: "added",
                header: "ADDED",
                cell: ({ row }) => (
                    <span className="text-c-slate-400 text-[12px]">{row.original.added}</span>
                ),
            },
            {
                accessorKey: "price",
                header: "PRICE",
                cell: ({ row }) => {
                    const inCart = cart.some((p) => p.id === row.original.id);
                    return (
                        <div className="flex items-center gap-2 justify-between">
                            <span className="text-c-emerald-400 text-[12px] font-semibold">
                                $ {row.original.price.toFixed(2)}
                            </span>
                            <button
                                title={inCart ? "Already in cart" : "Add to cart"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(row.original);
                                }}
                                disabled={inCart || isLoading}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                    inCart
                                        ? "bg-c-emerald-900 text-c-emerald-500 cursor-default"
                                        : "bg-c-emerald-600 hover:bg-c-emerald-500 text-white"
                                }`}
                            >
                                <ShoppingCart size={12} />
                            </button>
                        </div>
                    );
                },
            },
        ],
        [filters, setFilter, addToCart, cart, isLoading]
    );

    return (
        <div className="flex-1 min-w-0 p-4">
            {filteredProxies.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-c-slate-600">
                    <svg
                        width="36" height="36" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-c-emerald-900"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <p className="text-[14px] text-c-slate-400">No proxies match your filters</p>
                    <button
                        onClick={() => setFilters(EMPTY_FILTERS)}
                        className="text-[12px] text-c-emerald-500 underline hover:text-c-emerald-400"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <ReusableTable
                    columns={columns}
                    data={filteredProxies}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    itemsPerPage={20}
                    totalItems={totalItems}
                    onRowClick={(row) => setSelectedProxy(row)}
                    selectedRowId={selectedProxy?.id}
                    getRowId={(row) => row.id}
                />
            )}
        </div>
    );
}

export default ProxyTable;