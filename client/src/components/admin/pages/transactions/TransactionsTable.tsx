"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { Copy } from "lucide-react";
import { EditTransactionModal } from "@/components/modals/EditTransactionModal";
import { adminTopupApi, AdminTopupTransaction } from "@/lib/topup.service";
import type { DateRange } from "react-day-picker";

export interface TransactionRecord {
  id: string;
  date: string;
  rawDate: Date;
  username: string;
  wallet: string;
  walletAddress: string;
  txId: string;
  amount: number;
  status: "Confirmed" | "Awaiting" | "Failed";
  type: "transaction" | "manual";
  rawId: number;
  rawStatus: "pending" | "approved" | "rejected";
}

interface TransactionsTableProps {
  
  txIdQuery?: string;
  usernameQuery?: string;
  
  walletFilter?: string;
  
  dateRange?: DateRange;
  showDelete?: boolean;
  filter?: "all" | "transaction" | "manual";
  onRefresh?: () => void;
  maxItems?: number;
}

function toUiStatus(s: string): "Confirmed" | "Awaiting" | "Failed" {
  if (s === "approved") return "Confirmed";
  if (s === "rejected") return "Failed";
  return "Awaiting";
}

function mapToRecord(tx: AdminTopupTransaction): TransactionRecord {
  return {
    id: String(tx.id),
    rawId: tx.id,
    date: new Date(tx.date).toLocaleString(),
    rawDate: new Date(tx.date),
    username: tx.username ?? "-",
    wallet: tx.wallet,
    walletAddress: tx.walletAddress,
    txId: tx.txnId ?? "-",
    amount: tx.amount,
    status: toUiStatus(tx.status),
    type: tx.manuallyUploaded ? "manual" : "transaction",
    rawStatus: tx.status,
  };
}

export default function TransactionsTable({
  txIdQuery = "",
  usernameQuery = "",
  walletFilter = "all",
  dateRange,
  showDelete = false,
  filter = "all",
  onRefresh,
  maxItems,
}: TransactionsTableProps) {
  const [page, setPage] = useState(1);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionRecord | null>(null);
  const [allRecords, setAllRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminTopupApi.getTransactions();
      if (res.success) setAllRecords(res.transactions.map(mapToRecord));
    } catch (e) {
      console.error("Failed to fetch admin transactions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDelete = async (record: TransactionRecord) => {
    if (!confirm(`Delete transaction #${record.id}?`)) return;
    setDeletingId(record.rawId);
    try {
      await adminTopupApi.deleteTransaction(record.rawId);
      setAllRecords((prev) => prev.filter((r) => r.rawId !== record.rawId));
      onRefresh?.();
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = (updated: TransactionRecord) => {
    setAllRecords((prev) => prev.map((r) => (r.rawId === updated.rawId ? updated : r)));
    onRefresh?.();
  };

  const filteredData = useMemo(() => {
    let data = allRecords;

    
    if (filter === "transaction") data = data.filter((r) => r.type === "transaction");
    if (filter === "manual") data = data.filter((r) => r.type === "manual");

    
    if (txIdQuery) {
      const q = txIdQuery.toLowerCase();
      data = data.filter((item) => item.txId.toLowerCase().includes(q));
    }
    if (usernameQuery) {
      const q = usernameQuery.toLowerCase();
      data = data.filter((item) => item.username.toLowerCase().includes(q));
    }

    
    if (walletFilter && walletFilter !== "all") {
      data = data.filter(
        (item) => item.wallet.toLowerCase() === walletFilter.toLowerCase()
      );
    }

    
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      data = data.filter((item) => item.rawDate >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      data = data.filter((item) => item.rawDate <= to);
    }

    if (maxItems) data = data.slice(0, maxItems);
    return data;
  }, [allRecords, txIdQuery, usernameQuery, walletFilter, dateRange, filter, maxItems]);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const columns: ColumnDef<TransactionRecord>[] = [
    { accessorKey: "id", header: "#", cell: ({ row }) => <span className="font-medium text-c-slate-400">{row.original.id}</span> },
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-c-slate-300 text-sm">{row.original.date}</span> },
    { accessorKey: "username", header: "Username", cell: ({ row }) => <span className="text-c-slate-300">{row.original.username}</span> },
    { accessorKey: "wallet", header: "Wallet", cell: ({ row }) => <span className="text-c-slate-300">{row.original.wallet}</span> },
    {
      accessorKey: "walletAddress", header: "Wallet Address",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-c-slate-300">
          <span className="truncate max-w-[120px]">{row.original.walletAddress}</span>
          <Copy className="h-3.5 w-3.5 cursor-pointer text-c-slate-500 hover:text-c-slate-300 transition-colors" onClick={() => copyToClipboard(row.original.walletAddress)} />
        </div>
      ),
    },
    {
      accessorKey: "txId", header: "TxID",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-c-slate-300">
          <span className="truncate max-w-[100px]">{row.original.txId}</span>
          {row.original.txId !== "-" && <Copy className="h-3.5 w-3.5 cursor-pointer text-c-slate-500 hover:text-c-slate-300 transition-colors" onClick={() => copyToClipboard(row.original.txId)} />}
        </div>
      ),
    },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="text-c-slate-300 font-medium">$ {row.original.amount}</span> },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        const color = s === "Confirmed" ? "text-c-emerald-500" : s === "Failed" ? "text-c-rose-500" : "text-yellow-400";
        return <span className={`font-medium ${color}`}>{s}</span>;
      },
    },
    {
      id: "actions", header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 px-4 bg-c-emerald-500 hover:bg-c-emerald-600 text-white rounded text-xs" onClick={() => setTransactionToEdit(row.original)}>Edit</Button>
          {showDelete && (
            <Button size="sm" className="h-7 px-4 bg-c-red-300 hover:bg-c-red-400 text-white rounded text-xs" disabled={deletingId === row.original.rawId} onClick={() => handleDelete(row.original)}>
              {deletingId === row.original.rawId ? "..." : "Delete"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="flex items-center justify-center py-12 text-c-slate-400">Loading transactions...</div>;

  return (
    <>
      <ReusableTable columns={columns} data={filteredData} currentPage={page} setCurrentPage={setPage} itemsPerPage={10} totalItems={filteredData.length} />
      <EditTransactionModal transaction={transactionToEdit} open={transactionToEdit !== null} onOpenChange={(open) => { if (!open) setTransactionToEdit(null); }} onSaved={handleEditSave} />
    </>
  );
}