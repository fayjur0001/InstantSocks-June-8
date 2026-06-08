"use client";

import { useState, useEffect, useCallback } from "react";
import { Info, Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  dashboardApi,
  ChartDataPoint,
  SummaryBox,
  StatTab,
  StatPeriod,
  StatSummaryPeriod,
} from "@/lib/dashboard.service";

// ─── Re-export types ──────────────────────────────────────────────────────────
export type { ChartDataPoint };
export type SummaryBoxData = SummaryBox;

export interface CoinDataPoint {
  name: string; fullName: string;
  percentage: number; amount: number;
  color: string; tag?: string;
}

export type TabContext    = "transactions" | "remote-devices" | "numbers" | "proxy";
export type SummaryPeriod = StatSummaryPeriod;

// ─── Static coins ─────────────────────────────────────────────────────────────
const DUMMY_COINS: CoinDataPoint[] = [
  { name: "BTC",  fullName: "BTC",                percentage: 30, amount: 0.4411861,    color: "#f59e0b" },
  { name: "ETH",  fullName: "ETH",                percentage: 30, amount: 0.4411861,    color: "#6366f1" },
  { name: "USDT", fullName: "Thether USD (Tron)", percentage: 29, amount: 15629.577071, color: "#4ade80", tag: "TRX" },
  { name: "TRX",  fullName: "TRX",                percentage: 11, amount: 5053.477194,  color: "#ef4444" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toApiTab(ctx: TabContext): StatTab {
  return ctx === "proxy" ? "proxy" : "transactions";
}

function toApiTabForSummary(ctx: TabContext): StatTab {
  return ctx === "proxy" ? "proxy" : "transactions"; // summary নিজের tab অনুযায়ী
}

function toApiPeriod(t: "7D" | "1M" | "3M" | "Custom"): StatPeriod {
  if (t === "1M" || t === "Custom") return "1m";
  if (t === "3M") return "3m";
  return "7d";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({
  activeTab, tabContext, active, payload,
}: {
  activeTab: "Turnover" | "Top Users" | "Coins";
  tabContext: TabContext;
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  const renderBottomLine = () => {
    if (tabContext === "proxy") {
      return (
        <>
          <p className="text-c-slate-300 text-sm">Count: {data.deposit} proxy</p>
          {activeTab === "Turnover" && (
            <p className="text-c-slate-300 text-sm">Location: {(data as any).proxyLocation ?? "N/A"}</p>
          )}
        </>
      );
    }
    return <p className="text-c-slate-300 text-sm">Deposit {data.deposit}</p>;
  };

  return (
    <div className="bg-c-bg-600 p-4 rounded-lg border border-c-slate-700 shadow-xl">
      <p className="text-c-slate-200 text-sm mb-2">{data.date}</p>
      <p className="text-c-slate-300 text-sm mb-1">
        {activeTab === "Top Users"
          ? `${(data as any).name ?? "Unknown"} - ${data.turnover} USD`
          : `Turnover - ${data.turnover} USD`}
      </p>
      {renderBottomLine()}
    </div>
  );
};

// ─── Loading overlay ──────────────────────────────────────────────────────────
function ChartLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-c-bg-750/70 rounded-xl z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-c-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-c-slate-400 text-sm">Loading chart...</span>
      </div>
    </div>
  );
}

// ─── Summary skeleton ─────────────────────────────────────────────────────────
function SummarySkeleton() {
  return (
    <div className="bg-c-bg-750 border border-c-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 animate-pulse">
      <div className="h-3 w-16 bg-zinc-800 rounded" />
      <div className="h-6 w-20 bg-zinc-800 rounded" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function StatisticsArea({
  tabContext = "transactions",
}: {
  tabContext?: TabContext;
}) {
  const [activeTab,     setActiveTab]     = useState<"Turnover" | "Top Users" | "Coins">("Turnover");
  const [activeTime,    setActiveTime]    = useState<"7D" | "1M" | "3M" | "Custom">("7D");
  const [dateRange,     setDateRange]     = useState<DateRange | undefined>();
  const [summaryPeriod, setSummaryPeriod] = useState<StatSummaryPeriod>("today");

  const [chartData,      setChartData]      = useState<ChartDataPoint[]>([]);
  const [summaryBoxes,   setSummaryBoxes]   = useState<SummaryBox[]>([]);
  const [chartLoading,   setChartLoading]   = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── Fetch chart only (Turnover/Top Users tab) — শুধু chart data আনে ────────
  // summaryPeriod dependency নেই — period change এ fetchSummaryOnly আলাদাভাবে fire হবে
  const fetchTurnover = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await dashboardApi.getStatistics(
        toApiTab(tabContext),
        toApiPeriod(activeTime),
        "today",
      );
      if (res.success) setChartData(res.data.chartData);
      else setChartData([]);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [tabContext, activeTime]);

  // ── Fetch chart only (Top Users tab) ──────────────────────────────────────
  const fetchTopUsers = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await dashboardApi.getTopUsers(
        toApiTab(tabContext),
        toApiPeriod(activeTime),
      );
      if (res.success) setChartData(res.data.chartData);
      else setChartData([]);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [tabContext, activeTime]);

  // ── Fetch summary only (summaryPeriod changed while Turnover is active) ────
  const fetchSummaryOnly = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await dashboardApi.getSummaryBoxes(
        toApiTabForSummary(tabContext),
        summaryPeriod,
      );
      if (res.success) setSummaryBoxes(res.data.summaryBoxes);
      else setSummaryBoxes([]);
    } catch {
      setSummaryBoxes([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [tabContext, summaryPeriod]);

  // ── Effects ───────────────────────────────────────────────────────────────
  // chart tab বা time বদলালে: chart reload + summary reload
  useEffect(() => {
    if (activeTab === "Coins") {
      setChartLoading(false); setSummaryLoading(false); return;
    }
    if (activeTab === "Top Users") {
      fetchTopUsers();
      fetchSummaryOnly(); // Top Users tab এও summary দেখাবে
    } else {
      fetchTurnover();
      fetchSummaryOnly();
    }
  }, [activeTab, activeTime, tabContext, fetchTopUsers, fetchTurnover, fetchSummaryOnly]);

  // শুধু summaryPeriod বদলালে: শুধু summary reload (chart unchanged)
  useEffect(() => {
    fetchSummaryOnly();
  }, [summaryPeriod, fetchSummaryOnly]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

      {/* ── Chart Section ── */}
      <div className="xl:col-span-3 bg-c-bg-750 border border-c-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-c-slate-200">Statistics</h2>
            <Info className="w-4 h-4 text-c-orange-500 cursor-pointer" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category tab */}
            <div className="flex items-center text-xs bg-black rounded-md overflow-hidden border border-c-slate-800">
              {(["Turnover", "Top Users", "Coins"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "Coins") setActiveTime("7D");
                  }}
                  className={`px-3 py-1.5 transition-colors ${
                    activeTab === tab
                      ? "bg-c-green-500 text-white font-medium"
                      : "text-c-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Time tab */}
            <div className={`flex items-center text-xs bg-black rounded-md border border-c-slate-800 transition-opacity ${
              activeTab === "Coins" ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}>
              {(["7D", "1M", "3M"] as const).map((time, idx) => (
                <button
                  key={time}
                  onClick={() => { setActiveTime(time); setDateRange(undefined); }}
                  className={`px-3 py-1.5 transition-colors ${
                    idx !== 0 ? "border-l border-c-slate-800" : ""
                  } ${
                    activeTime === time
                      ? "bg-c-green-500 text-white font-medium"
                      : "text-c-slate-400 hover:text-white"
                  }`}
                >
                  {time}
                </button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setActiveTime("Custom")}
                    className={cn(
                      "px-3 py-1.5 border-l border-c-slate-800 flex items-center justify-center transition-colors",
                      activeTime === "Custom"
                        ? "bg-c-green-500 text-white"
                        : "text-c-slate-400 hover:text-white",
                    )}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-c-bg-700 border-c-slate-700" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => { setDateRange(range); setActiveTime("Custom"); }}
                    numberOfMonths={2}
                    className="text-c-slate-200"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div className="relative min-h-[250px] w-full flex items-center justify-center">
          {chartLoading && activeTab !== "Coins" && <ChartLoadingOverlay />}

          {activeTab === "Coins" ? (
            <div className="flex flex-col md:flex-row items-center justify-around w-full gap-8">
              <div className="h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DUMMY_COINS.filter((c) => c.percentage > 0)}
                      innerRadius={60} outerRadius={100}
                      dataKey="percentage" stroke="none" labelLine={false}
                      label={({ cx, cy, midAngle = 0, innerRadius, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs">
                            {`${value}%`}
                          </text>
                        );
                      }}
                    >
                      {DUMMY_COINS.filter((c) => c.percentage > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-3 min-w-[250px] w-full md:w-auto overflow-x-auto">
                <p className="text-c-slate-400 text-xs mb-1">Top coins</p>
                {DUMMY_COINS.map((coin, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-sm min-w-max">
                    <div
                      className="w-32 py-1.5 px-2 text-center rounded text-white text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ backgroundColor: coin.color }}
                    >
                      {coin.fullName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-c-slate-300">
                        {coin.amount.toFixed(coin.amount === 0 ? 2 : 6)}
                      </span>
                      <span className="font-semibold" style={{ color: coin.color }}>{coin.name}</span>
                      {coin.tag && (
                        <span className="bg-c-red-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                          {coin.tag}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : chartData.length === 0 && !chartLoading ? (
            <div className="flex flex-col items-center justify-center h-[250px] gap-2">
              <span className="text-c-slate-400 text-sm">No data for this period</span>
            </div>

          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0fa46f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0fa46f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3340" vertical={false} />
                <XAxis
                  dataKey="date" stroke="#64748b" fontSize={12}
                  tickLine={false} axisLine={false} dy={10} minTickGap={30}
                />
                <YAxis
                  stroke="#64748b" fontSize={12}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <RechartsTooltip content={<CustomTooltip activeTab={activeTab} tabContext={tabContext} />} />
                <Area
                  type="monotone" dataKey="value" stroke="#0fa46f"
                  strokeWidth={2} fillOpacity={1} fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Summary Boxes (right column) ── */}
      <div className="xl:col-span-1 flex flex-col gap-3">
        <Select
          value={summaryPeriod}
          onValueChange={(val) => setSummaryPeriod(val as StatSummaryPeriod)}
        >
          <SelectTrigger className="w-full bg-c-bg-750 border-c-slate-700 text-c-slate-200 focus:ring-c-green-500 focus:ring-offset-0 focus:border-c-green-500">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-c-bg-750 border-c-slate-700 text-c-slate-200">
            <SelectItem value="today"   className="focus:bg-c-slate-800 focus:text-white cursor-pointer">Today</SelectItem>
            <SelectItem value="3days"   className="focus:bg-c-slate-800 focus:text-white cursor-pointer">3 Days</SelectItem>
            <SelectItem value="weekly"  className="focus:bg-c-slate-800 focus:text-white cursor-pointer">Weekly</SelectItem>
            <SelectItem value="monthly" className="focus:bg-c-slate-800 focus:text-white cursor-pointer">Monthly</SelectItem>
          </SelectContent>
        </Select>

        {/* Summary grid — proxy ও transactions দুটোর জন্যই same 2-col layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-3 auto-rows-max">
          {summaryLoading
            ? Array.from({ length: 6 }).map((_, i) => <SummarySkeleton key={i} />)
            : summaryBoxes.length === 0
            ? (
              <div className="col-span-2 text-center text-c-slate-500 text-sm py-6">
                No data for this period
              </div>
            )
            : summaryBoxes.map((box, idx) => (
              <div
                key={idx}
                className="bg-c-bg-750 border border-c-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1 hover:border-c-slate-700 transition-colors"
              >
                <span className="text-xs text-c-slate-400">{box.label}</span>
                <span className={`text-lg font-semibold ${box.highlight ? "text-c-orange-500" : "text-c-slate-200"}`}>
                  {box.value}
                </span>
                {box.subValue && (
                  <span className="text-xs text-c-orange-500 mt-1">{box.subValue}</span>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}