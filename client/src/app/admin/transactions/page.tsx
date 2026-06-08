"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { AddBalanceModal } from "@/components/modals/AddBalanceModal";
import TransactionsTable from "@/components/admin/pages/transactions/TransactionsTable";

export default function TransactionsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabTriggerClass =
    "data-[state=active]:bg-c-bg-700 data-[state=active]:text-c-emerald-400 data-[state=active]:border-c-emerald-500/50 border border-transparent text-c-slate-400 px-6 py-2.5 rounded-md transition-all";

  const walletOptions = [
    "BCH", "BNBBSC", "BTC", "DOGE", "ETH",
    "LTC", "SOL", "TON", "TRX", "USDC", "USDTTRC20",
  ];

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="w-full rounded-[12px] bg-c-bg-850 p-3 lg:p-6 space-y-6">
      <AddBalanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
      />

      <Tabs defaultValue="transactions" className="w-full">
        {/* Header Navigation & New Button */}
        <div className="flex flex-wrap gap-6 flex-wrap justify-between items-center mb-4">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2.5 justify-start border-none">
            <TabsTrigger value="all" className={tabTriggerClass}>
              All
            </TabsTrigger>
            <TabsTrigger value="transactions" className={tabTriggerClass}>
              Transactions
            </TabsTrigger>
            <TabsTrigger value="manual-top-up" className={tabTriggerClass}>
              Manual Top Up
            </TabsTrigger>
          </TabsList>

          <Button
            className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white font-semibold px-6 ml-auto"
            onClick={() => setIsModalOpen(true)}
          >
            New
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-c-bg-700 border border-c-slate-800 rounded-xl p-5 shadow-sm mb-6">
          <div className="flex flex-col space-y-4">
            {/* Top Row: Inputs & Selects */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="TXID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500 focus-visible:ring-c-emerald-500/50"
              />

              <Input
                placeholder="Username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500 focus-visible:ring-c-emerald-500/50"
              />

              <Select defaultValue="all">
                <SelectTrigger className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 w-full focus:ring-c-emerald-500/50">
                  <SelectValue placeholder="Wallet Name/All" />
                </SelectTrigger>
                <SelectContent className="bg-c-bg-700 border-c-slate-700 text-c-slate-200">
                  <SelectItem value="all">Wallet Name/All</SelectItem>
                  {walletOptions.map((coin) => (
                    <SelectItem key={coin} value={coin.toLowerCase()}>
                      {coin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-c-bg-800 border-c-slate-700 hover:bg-c-bg-700 hover:text-c-slate-200",
                      !dateRange && "text-c-slate-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} –{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>All Time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-c-bg-700 border-c-slate-700"
                  align="start"
                >
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="text-c-slate-200"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white px-6 shadow-sm"
                onClick={() => setActiveSearch(searchQuery)}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                variant="destructive"
                className="bg-c-rose-500/10 text-c-rose-500 hover:bg-c-rose-500/20 border border-c-rose-500/20 shadow-none px-6"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSearch("");
                  setDateRange(undefined);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-c-bg-700 rounded-xl border border-c-slate-800 p-0 overflow-hidden">
          <TabsContent value="all" className="mt-0 outline-none">
            <TransactionsTable
              key={`all-${refreshKey}`}
              searchQuery={activeSearch}
              showDelete={false}
              filter="all"
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="transactions" className="mt-0 outline-none">
            <TransactionsTable
              key={`tx-${refreshKey}`}
              searchQuery={activeSearch}
              showDelete={false}
              filter="transaction"
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="manual-top-up" className="mt-0 outline-none">
            <TransactionsTable
              key={`manual-${refreshKey}`}
              searchQuery={activeSearch}
              showDelete={true}
              filter="manual"
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}