"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { topupApi, TopupTransaction } from "@/lib/topup.service";

export interface TransactionHistoryData {
  id: string;
  date: string;
  deposit: string;
  service: string;
  otr: string;
  ltr: string;
  devices: string;
  mobileProxy: string;
  socks5: string;
  balance: string;
  totalCost: string;
}


const toDate = (str: string) => parseISO(str);

const toStr = (d: Date) => format(d, "yyyy-MM-dd");


function mapToHistoryRow(tx: TopupTransaction, idx: number): TransactionHistoryData {
  const dateStr = format(new Date(tx.date), "yyyy-MM-dd");
  const isDeposit = tx.status === "approved";
  const amountStr = isDeposit ? `$${tx.amount.toFixed(2)}` : "-";

  return {
    id: String(idx + 1).padStart(2, "0"),
    date: dateStr,
    deposit: isDeposit ? amountStr : "-",
    service: "Added Fund",
    otr: "-",
    ltr: "-",
    devices: "-",
    mobileProxy: "-",
    socks5: "-",
    balance: isDeposit ? amountStr : "-",
    totalCost: "-",
  };
}

const TransactionHistoryTable = ({ searchQuery }: { searchQuery?: string }) => {
  const [page, setPage] = useState(1);
  const [rawData, setRawData] = useState<TransactionHistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(toDate("2026-01-01"));
  const [toDate_, setToDate] = useState<Date>(new Date());

  const [appliedFrom, setAppliedFrom] = useState("2026-01-01");
  const [appliedTo, setAppliedTo] = useState(toStr(new Date()));

  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await topupApi.getTransactions();
      if (res.success) {
        setRawData(res.transactions.map(mapToHistoryRow));
      }
    } catch (e) {
      console.error("Failed to fetch transaction history:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = () => {
    setAppliedFrom(toStr(fromDate));
    setAppliedTo(toStr(toDate_));
    setPage(1);
  };

  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.includes(searchQuery);
      const matchesDateRange =
        item.date >= appliedFrom && item.date <= appliedTo;
      return matchesSearch && matchesDateRange;
    });
  }, [rawData, searchQuery, appliedFrom, appliedTo]);

  const totals = useMemo(() => {
    const sum = (key: keyof TransactionHistoryData) =>
      filteredData
        .reduce((acc, row) => {
          const val = parseFloat(row[key].replace(/[$,]/g, ""));
          return acc + (isNaN(val) ? 0 : val);
        }, 0)
        .toFixed(2);

    return {
      deposit: `$${sum("deposit")}`,
      socks5: `$${sum("socks5")}`,
      balance: `$${sum("balance")}`,
      totalCost: `$${sum("totalCost")}`,
    };
  }, [filteredData]);

  const footerCell = (value: string, bold = false) => (
    <span
      className={`text-white text-[12px] ${bold ? "font-bold" : "font-semibold"}`}
    >
      {value}
    </span>
  );

  const columns: ColumnDef<TransactionHistoryData>[] = [
    {
      accessorKey: "id",
      header: "#",
      cell: ({ row }) => <span>{row.original.id}</span>,
      footer: () => footerCell("Total", true),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span>{row.original.date}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "deposit",
      header: "Deposit",
      cell: ({ row }) => <span>{row.original.deposit}</span>,
      footer: () => footerCell(totals.deposit),
    },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => <span>{row.original.service}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "otr",
      header: "OTR",
      cell: ({ row }) => <span>{row.original.otr}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "ltr",
      header: "LTR",
      cell: ({ row }) => <span>{row.original.ltr}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "devices",
      header: "Devices",
      cell: ({ row }) => <span>{row.original.devices}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "mobileProxy",
      header: "Mobile Proxy",
      cell: ({ row }) => <span>{row.original.mobileProxy}</span>,
      footer: () => footerCell("-"),
    },
    {
      accessorKey: "socks5",
      header: "Socks5",
      cell: ({ row }) => <span>{row.original.socks5}</span>,
      footer: () => footerCell(totals.socks5),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => (
        <span
          className={`text-[12px] font-medium ${
            row.original.balance.startsWith("$-")
              ? "text-c-rose-400"
              : "text-c-slate-300"
          }`}
        >
          {row.original.balance}
        </span>
      ),
      footer: () => footerCell(totals.balance),
    },
    {
      accessorKey: "totalCost",
      header: "Total Cost",
      cell: ({ row }) => <span>{row.original.totalCost}</span>,
      footer: () => footerCell(totals.totalCost, true),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-c-emerald-400 font-semibold text-base">
          Transaction History
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {}
          <span className="text-c-slate-400 text-sm">From</span>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-36 h-8 px-3 justify-start text-left text-sm font-normal bg-c-bg-650 border-c-slate-700 text-c-slate-200 hover:bg-c-bg-650 hover:text-c-slate-200",
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-c-slate-400 shrink-0" />
                {format(fromDate, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-c-bg-700 border-c-slate-700" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => {
                  if (d) {
                    setFromDate(d);
                    setFromOpen(false);
                  }
                }}
                initialFocus
                className="text-c-slate-200"
              />
            </PopoverContent>
          </Popover>

          {}
          <span className="text-c-slate-400 text-sm">To</span>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-36 h-8 px-3 justify-start text-left text-sm font-normal bg-c-bg-650 border-c-slate-700 text-c-slate-200 hover:bg-c-bg-650 hover:text-c-slate-200",
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-c-slate-400 shrink-0" />
                {format(toDate_, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-c-bg-700 border-c-slate-700" align="start">
              <Calendar
                mode="single"
                selected={toDate_}
                onSelect={(d) => {
                  if (d) {
                    setToDate(d);
                    setToOpen(false);
                  }
                }}
                initialFocus
                className="text-c-slate-200"
              />
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            onClick={handleApply}
            className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white h-8 px-4"
          >
            Apply
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-c-slate-400 text-sm py-4 text-center">
          Loading...
        </div>
      )}

      {}
      {!loading && (
        <ReusableTable
          columns={columns}
          data={filteredData}
          currentPage={page}
          setCurrentPage={setPage}
          itemsPerPage={10}
          totalItems={filteredData.length}
        />
      )}
    </div>
  );
};

export default TransactionHistoryTable;