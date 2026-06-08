import { toFlagEmoji } from "@/lib/helpers";
import { Country, FilterState } from "@/types/user/socks5-proxy-ips";
import React from "react";

interface CountryProps {
    regionCountries: Country[]; // Changed from any[]
    setActiveCountry: (country: string) => void;
    setFilters: (filters: FilterState) => void; // Changed from any
    setPage: React.Dispatch<React.SetStateAction<number>>; // Changed from (page: number) => void
    activeCountry: string;
    EMPTY_FILTERS: FilterState; // Changed from any
}

function CountrySelector({ regionCountries, setActiveCountry, setFilters, setPage, activeCountry, EMPTY_FILTERS }: CountryProps) {
    return (
        <div className="pt-4 border-t border-c-slate-800/40">
            <div className="flex flex-wrap gap-2">
                {regionCountries.map((c) => (
                    <button
                        key={c.code}
                        onClick={() => {
                            setActiveCountry(c.code);
                            setFilters(EMPTY_FILTERS);
                            setPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 border ${activeCountry === c.code
                            ? "bg-c-emerald-600/20 text-c-emerald-400 border-c-emerald-500/50"
                            : "bg-c-slate-900/30 text-c-slate-500 border-c-slate-800/50 hover:bg-c-slate-800 hover:text-c-slate-300"
                            }`}
                    >
                        <span className="text-[14px] leading-none">{toFlagEmoji(c.code)}</span>
                        <span>
                            {c.name} - {c.count}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default CountrySelector