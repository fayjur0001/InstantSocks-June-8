"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionRecord } from "../admin/pages/transactions/TransactionsTable";
import { adminTopupApi } from "@/lib/topup.service";

interface EditTransactionModalProps {
  transaction: TransactionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: TransactionRecord) => void;
}

const uiToApi = { Confirmed: "approved", Awaiting: "pending", Failed: "rejected" } as const;

export function EditTransactionModal({ transaction, open, onOpenChange, onSaved }: EditTransactionModalProps) {
  const [txId, setTxId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"Confirmed" | "Awaiting" | "Failed">("Awaiting");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setTxId(transaction.txId === "-" ? "" : transaction.txId);
      setWalletAddress(transaction.walletAddress);
      setWalletName(transaction.wallet);
      setAmount(String(transaction.amount));
      setStatus(transaction.status);
      setError(null);
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminTopupApi.updateTransaction(transaction.rawId, {
        txid: txId.trim() || null,
        walletAddress: walletAddress.trim(),
        currency: walletName.trim(),
        amount: Number(amount),
        status: uiToApi[status],
      });
      if (res.success) {
        onSaved?.({ ...transaction, txId: txId.trim() || "-", walletAddress: walletAddress.trim(), wallet: walletName.trim(), amount: Number(amount), status, rawStatus: uiToApi[status] });
        onOpenChange(false);
      }
    } catch (e: any) {
      let msg = "Failed to save.";
      try { msg = JSON.parse(e.message)?.message ?? msg; } catch {}
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-c-bg-700 border-c-slate-800 text-c-slate-200 sm:max-w-[650px] p-6 shadow-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-semibold tracking-wide">You are editing transaction no #{transaction?.id || ""}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-username" className="text-c-slate-200 font-medium text-sm">Username</Label>
            <Input id="edit-username" defaultValue={transaction?.username} disabled className="bg-c-bg-400 border-transparent text-c-slate-400 h-10 cursor-not-allowed" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-txid" className="text-c-slate-200 font-medium text-sm">TXID</Label>
            <Input id="edit-txid" value={txId} onChange={(e) => setTxId(e.target.value)} className="bg-c-bg-400 border-transparent focus-visible:ring-1 focus-visible:ring-c-emerald-500 text-c-slate-200 h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-wallet-address" className="text-c-slate-200 font-medium text-sm">Wallet Address</Label>
            <Input id="edit-wallet-address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="bg-c-bg-400 border-transparent focus-visible:ring-1 focus-visible:ring-c-emerald-500 text-c-slate-200 h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-wallet-name" className="text-c-slate-200 font-medium text-sm">Wallet Name</Label>
            <Input id="edit-wallet-name" value={walletName} onChange={(e) => setWalletName(e.target.value)} className="bg-c-bg-400 border-transparent focus-visible:ring-1 focus-visible:ring-c-emerald-500 text-c-slate-200 h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-amount" className="text-c-slate-200 font-medium text-sm">Amount</Label>
            <Input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-c-bg-400 border-transparent focus-visible:ring-1 focus-visible:ring-c-emerald-500 text-c-slate-200 h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-status" className="text-c-slate-200 font-medium text-sm">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="bg-c-bg-400 w-full border-transparent focus:ring-1 focus:ring-c-emerald-500 text-c-slate-200 h-10"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent className="bg-c-bg-400 border-c-slate-700 text-c-slate-200">
                <SelectItem value="Confirmed" className="focus:text-white cursor-pointer hover:bg-white/10!">Confirmed</SelectItem>
                <SelectItem value="Awaiting" className="focus:text-white cursor-pointer hover:bg-white/10!">Awaiting</SelectItem>
                <SelectItem value="Failed" className="focus:text-white cursor-pointer hover:bg-white/10!">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        <DialogFooter className="gap-2 mt-4 sm:justify-end">
          <Button className="bg-c-green-500 hover:bg-c-green-500 text-white px-6 font-semibold" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          <Button className="bg-c-red-300 hover:bg-c-red-400 text-white px-6 font-semibold" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}