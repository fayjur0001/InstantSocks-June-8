"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { adminUsersService, AdminUserApiItem } from "@/lib/admin-users.service";
import { adminUsersTopupApi } from "@/lib/topup.service";

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddBalanceModal({ isOpen, onClose, onSuccess }: AddBalanceModalProps) {
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserLabel, setSelectedUserLabel] = useState("");
  const [txid, setTxid] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [users, setUsers] = useState<AdminUserApiItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingUsers(true);
    adminUsersService
      .getUsers({ page: 1, limit: 200 })
      .then((res) => { if (res.success) setUsers(res.users); })
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, [isOpen]);

  const handleClose = () => {
    setSelectedUserId(null);
    setSelectedUserLabel("");
    setTxid("");
    setWalletAddress("");
    setCurrency("");
    setAmount("");
    setError(null);
    setSuccess(false);
    setOpenCombobox(false);
    onClose();
  };

  const handleSave = async () => {
    setError(null);
    if (!selectedUserId) { setError("Please select a user."); return; }
    if (!walletAddress.trim()) { setError("Wallet address is required."); return; }
    if (!currency.trim()) { setError("Wallet name / currency is required."); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount."); return;
    }
    setSubmitting(true);
    try {
      await adminUsersTopupApi.addBalance(selectedUserId, {
        amount: Number(amount),
        currency: currency.trim(),
        walletAddress: walletAddress.trim(),
        txid: txid.trim() || undefined,
      });
      setSuccess(true);
      onSuccess?.();
      setTimeout(handleClose, 800);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to add balance.";
      try { setError(JSON.parse(msg).message ?? msg); }
      catch { setError(msg); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-c-bg-700 border-c-slate-800 text-c-slate-200 sm:max-w-[500px]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold text-white">
            Manually add balance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between bg-c-bg-600 border-c-slate-700 text-c-slate-200 hover:bg-c-bg-450 hover:text-white font-normal"
              >
                {selectedUserLabel || (loadingUsers ? "Loading users..." : "Search and select user...")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 bg-c-bg-700 border-c-slate-700">
              <Command className="bg-transparent">
                <CommandInput
                  placeholder="Search username..."
                  className="text-c-slate-200 placeholder:text-c-slate-400"
                />
                <CommandList>
                  <CommandEmpty className="py-6 text-center text-sm text-c-slate-400">
                    No user found.
                  </CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.username}
                        onSelect={() => {
                          setSelectedUserId(user.id);
                          setSelectedUserLabel(user.username);
                          setOpenCombobox(false);
                        }}
                        className="text-c-slate-200 hover:bg-c-bg-450 aria-selected:bg-c-bg-450 aria-selected:text-c-emerald-400 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-c-emerald-500",
                            selectedUserId === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {user.username}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Input
            placeholder="TXID"
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 focus-visible:ring-c-emerald-500/50 placeholder:text-c-slate-400"
          />
          <Input
            placeholder="Wallet Address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 focus-visible:ring-c-emerald-500/50 placeholder:text-c-slate-400"
          />
          <Input
            placeholder="Wallet Name"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 focus-visible:ring-c-emerald-500/50 placeholder:text-c-slate-400"
          />
          <Input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-c-bg-600 border-c-slate-700 text-c-slate-200 focus-visible:ring-c-emerald-500/50 placeholder:text-c-slate-400"
          />

          {error && <p className="text-xs text-red">{error}</p>}
          {success && <p className="text-xs text-green">Balance added successfully!</p>}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            className="bg-c-emerald-500 hover:bg-c-emerald-600 text-white font-medium px-6"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button
            className="bg-c-red-300 hover:bg-c-red-400 text-white font-medium px-6"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}