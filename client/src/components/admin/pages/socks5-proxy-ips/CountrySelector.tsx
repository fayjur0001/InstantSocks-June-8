import { Country, FilterState } from "@/types/admin/socks5-proxy-ips";
import React from "react";

interface CountryProps {
    regionCountries: Country[]; 
    setActiveCountry: (country: string) => void;
    setFilters: (filters: FilterState) => void; 
    setPage: React.Dispatch<React.SetStateAction<number>>; 
    activeCountry: string;
    EMPTY_FILTERS: FilterState; 
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
                        <img
                            src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`}
                            width={16}
                            height={12}
                            alt={c.code}
                            className="inline-block shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
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