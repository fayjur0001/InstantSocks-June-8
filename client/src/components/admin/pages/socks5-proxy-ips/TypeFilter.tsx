import { FilterState, ProxyTypeTab } from "@/types/admin/socks5-proxy-ips";

const TYPE_TABS: { value: ProxyTypeTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "residential", label: "Residential" },
  { value: "hosting", label: "Hosting" },
  { value: "non-backlisted", label: "Non-backlisted" },
];

interface TypeFilterProps {
    setTypeTab: (tab: ProxyTypeTab) => void;
    typeTab: ProxyTypeTab;
    setFilters: (filters: FilterState) => void;
    setPage: (page: number) => void;
    EMPTY_FILTERS: FilterState;
}


function TypeFilter({setTypeTab, typeTab, setFilters, setPage, EMPTY_FILTERS}: TypeFilterProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 gap-y-2 px-5 py-3 border-b border-c-slate-800/60 bg-c-bg-900/30">
            {TYPE_TABS.map((tab) => (
                <label
                    key={tab.value}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setTypeTab(tab.value)}
                >
                    {/* Radio circle */}
                    <div
                        className={`w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${typeTab === tab.value
                            ? "border-c-emerald-500"
                            : "border-c-slate-600 group-hover:border-c-slate-500"
                            }`}
                    >
                        {typeTab === tab.value && (
                            <div className="w-[6px] h-[6px] rounded-full bg-c-emerald-500" />
                        )}
                    </div>
                    <span
                        className={`text-[13px] select-none transition-colors ${typeTab === tab.value
                            ? "text-c-slate-200"
                            : "text-c-slate-500 group-hover:text-c-slate-400"
                            }`}
                    >
                        {tab.label}
                    </span>
                </label>
            ))}

            <button
                onClick={() => {
                    setTypeTab("all");
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                }}
                className="ml-auto text-[11px] font-bold uppercase tracking-tighter text-c-red-400 bg-c-red-500/10 border border-c-red-500/30 cursor-pointer hover:border-c-red-500/50 hover:bg-c-red-500/20 px-4 py-1.5 rounded-full transition-all"
            >
                Reset
            </button>
        </div>
    )
}

export default TypeFilter