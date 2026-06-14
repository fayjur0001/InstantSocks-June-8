"use client";

import { useState, useEffect, useCallback } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, X, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import WalletModal from "@/components/modals/WalletModal";
import { topupApi } from "@/lib/topup.service";
import { publicTopUpApi, PublicTopUpSettings } from "@/lib/api";

type UiStatus = "Completed" | "Awaiting" | "Cancelled";

function toUiStatus(status: string): UiStatus {
    if (status === "approved") return "Completed";
    if (status === "rejected") return "Cancelled";
    return "Awaiting";
}

interface TableRow {
    id: string;
    date: string;
    wallet: string;
    walletAddress: string;
    transactionId: string;
    amount: number;
    status: UiStatus;
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
            return <code key={i} className="text-green text-xs bg-green/10 px-1 rounded">{part.slice(1, -1)}</code>;
        return part;
    });
}

// ── Markdown → React elements ─────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.map((line, i) => {
        if (line.startsWith("## "))
            return <h2 key={i} className="text-xl font-bold text-white leading-snug">{renderInline(line.replace(/^##\s*/, ""))}</h2>;
        if (line.startsWith("# "))
            return <h1 key={i} className="text-2xl font-bold text-white leading-snug">{renderInline(line.replace(/^#\s*/, ""))}</h1>;
        return <p key={i} className="text-sm text-c-slate-400 leading-relaxed">{renderInline(line)}</p>;
    });
}

// ── Size map: admin যে size পাঠাবে সেই অনুযায়ী modal-এর width ও maxHeight ─────
const sizeMap: Record<string, { width: string; maxHeight: string }> = {
    sm:   { width: "max-w-sm",  maxHeight: "max-h-[300px]" },
    md:   { width: "max-w-md",  maxHeight: "max-h-[420px]" },
    lg:   { width: "max-w-lg",  maxHeight: "max-h-[560px]" },
    xl:   { width: "max-w-xl",  maxHeight: "max-h-[680px]" },
    "2xl":{ width: "max-w-2xl", maxHeight: "max-h-[780px]" },
    full: { width: "max-w-3xl", maxHeight: "max-h-[90vh]"  },
};

// ── Deposit Popup Banner (centered modal) ─────────────────────────────────────
function DepositPopupBanner({
    popUpText,
    popUpSize = "md",
    onClose,
}: {
    popUpText: string;
    popUpSize?: string;
    onClose: () => void;
}) {
    const size = sizeMap[popUpSize] ?? sizeMap["md"];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`relative w-full ${size.width} mx-4 rounded-2xl border border-green/30 bg-c-bg-700 shadow-2xl shadow-black/50 overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top glow bar */}
                <div className="h-1 w-full bg-gradient-to-r from-green/0 via-green to-green/0" />

                {/* Glow blob */}
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-green/20 blur-3xl" />

                {/* Content — scrollable যদি content বেশি হয় */}
                <div className={`relative px-8 py-8 flex flex-col items-center text-center gap-4 overflow-y-auto ${size.maxHeight}`}>
                    {/* Icon */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/15 border border-green/30">
                        <Sparkles className="w-7 h-7 text-green" />
                    </div>

                    {/* Markdown rendered content */}
                    <div className="flex flex-col items-center gap-2 w-full">
                        {renderMarkdown(popUpText)}
                    </div>
                </div>

                {/* Close X */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-c-slate-500 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
    const [selectedCoin, setSelectedCoin] = useState("");
    const [cryptoAmount, setCryptoAmount] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [walletAddress, setWalletAddress] = useState("");
    const [payAmount, setPayAmount] = useState<number | null>(null);
    const [convertedAmount, setConvertedAmount] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedTag, setSelectedTag] = useState("all");
    const [topUpSettings, setTopUpSettings] = useState<PublicTopUpSettings | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        publicTopUpApi.getSettings()
            .then(({ data }) => {
                setTopUpSettings(data);
                if (data.popUpText?.trim()) setShowBanner(true);
            })
            .catch((err) => console.error("Failed to load topup settings:", err));
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await topupApi.getTransactions();
            if (res.success) {
                setTransactions(
                    res.transactions.map((t) => ({
                        id: String(t.id),
                        date: new Date(t.date).toLocaleDateString("en-GB"),
                        wallet: t.wallet,
                        walletAddress: t.walletAddress,
                        transactionId: t.txnId ?? "—",
                        amount: t.amount,
                        status: toUiStatus(t.status),
                    }))
                );
            }
        } catch (e) {
            console.error("Failed to fetch transactions:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    useEffect(() => {
        if (!selectedCoin || !cryptoAmount || isNaN(Number(cryptoAmount))) {
            setConvertedAmount(null); return;
        }
        const timeout = setTimeout(async () => {
            try {
                const res = await topupApi.convert(Number(cryptoAmount), selectedCoin);
                setConvertedAmount(res.convertedAmount);
            } catch { setConvertedAmount(null); }
        }, 600);
        return () => clearTimeout(timeout);
    }, [selectedCoin, cryptoAmount]);

    const handleGetWallet = async () => {
        if (!selectedCoin) { setGenerationError("Please select a coin."); return; }
        if (!cryptoAmount || isNaN(Number(cryptoAmount)) || Number(cryptoAmount) <= 0) {
            setGenerationError("Please enter a valid amount."); return;
        }
        setGenerationError(null);
        setIsGenerating(true);
        try {
            const res = await topupApi.generateNowPayments(selectedCoin, Number(cryptoAmount));
            if (res.success && res.payment?.pay_address) {
                setWalletAddress(res.payment.pay_address);
                setPayAmount(res.payment.pay_amount ?? null);
                setWalletModalOpen(true);
                fetchTransactions();
            } else {
                setGenerationError("Failed to generate wallet address.");
            }
        } catch (e: any) {
            const msg = e?.message ?? "Failed to generate wallet address.";
            try { setGenerationError(JSON.parse(msg).message ?? msg); }
            catch { setGenerationError(msg); }
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredData =
        selectedTag === "all"
            ? transactions
            : transactions.filter(
                (item) => item.wallet.toLowerCase() === selectedTag.toLowerCase()
            );

    const statusStyles: Record<UiStatus, string> = {
        Completed: "bg-green/10 text-green border-green/20 hover:bg-green/20",
        Awaiting: "bg-red/10 text-red border-red/20 hover:bg-red/20",
        Cancelled: "bg-white/5 text-c-slate-400 border-white/10 hover:bg-white/10",
    };

    const transactionColumns: ColumnDef<TableRow>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-c-slate-400 font-medium">{row.original.date}</span>
            ),
        },
        {
            accessorKey: "wallet",
            header: "Wallet",
            cell: ({ row }) => (
                <span className="text-c-slate-300">{row.original.wallet}</span>
            ),
        },
        {
            accessorKey: "walletAddress",
            header: "Wallet Address",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-c-slate-500">
                    <span className="truncate max-w-[200px]">{row.original.walletAddress}</span>
                    <Copy
                        className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors"
                        onClick={() => navigator.clipboard.writeText(row.original.walletAddress)}
                    />
                </div>
            ),
        },
        {
            accessorKey: "transactionId",
            header: "Transaction ID",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-c-slate-500">
                    <span className="truncate max-w-[200px]">{row.original.transactionId}</span>
                    <Copy
                        className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors"
                        onClick={() => navigator.clipboard.writeText(row.original.transactionId)}
                    />
                </div>
            ),
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ getValue }) => (
                <span className="font-bold text-white">${getValue<number>().toFixed(2)}</span>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ getValue }) => {
                const status = getValue<UiStatus>();
                return (
                    <Badge
                        variant="outline"
                        className={`rounded-full px-3 py-0.5 border font-medium ${statusStyles[status]}`}
                    >
                        {status}
                    </Badge>
                );
            },
        },
    ];

    const REDIRECT_TEXT = "Input deposit amount and click on pay now. You will be redirected to the payment page.";

    return (
        <div>
            {/* ── Popup Banner ── */}
            {showBanner && topUpSettings?.popUpText && (
                <DepositPopupBanner
                    popUpText={topUpSettings.popUpText}
                    popUpSize={topUpSettings.popUpSize}
                    onClose={() => setShowBanner(false)}
                />
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                    {/* 1. Crypto Payment */}
                    <div className="relative p-5 bg-black rounded-[12px] border transition-all cursor-pointer border-white/10 hover:border-white/20">
                        <h3 className="font-semibold text-green mb-2">Crypto Payment</h3>
                        {topUpSettings?.cryptoText && (
                            <p className="text-xs text-c-slate-400 mb-3 leading-relaxed">
                                {topUpSettings.cryptoText}
                            </p>
                        )}
                        <div className="space-y-3">
                            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                                <SelectTrigger className="bg-black/20 border-white/10 focus:ring-c-green-400 w-full text-white">
                                    <SelectValue placeholder="Select a Coin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                                    <SelectItem value="usdttrc20">Tether (USDT)</SelectItem>
                                    <SelectItem value="ltc">Litecoin (LTC)</SelectItem>
                                    <SelectItem value="sol">Solana (SOL)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="Enter amount (USD)..."
                                type="number"
                                min={1}
                                value={cryptoAmount}
                                onChange={(e) => setCryptoAmount(e.target.value)}
                            />
                            {convertedAmount && selectedCoin && (
                                <p className="text-xs text-c-slate-400">
                                    ≈ {convertedAmount} {selectedCoin.toUpperCase()}
                                </p>
                            )}
                            {generationError && (
                                <p className="text-xs text-red">{generationError}</p>
                            )}
                            <Button
                                onClick={handleGetWallet}
                                disabled={isGenerating}
                                className="w-full"
                            >
                                {isGenerating ? "Generating..." : "Get Wallet Address"}
                            </Button>
                        </div>
                    </div>

                    {/* 2. PayPal */}
                    <div className="relative p-5 bg-black rounded-[12px] border transition-all cursor-pointer border-white/10 hover:border-white/20">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl font-bold text-green">PayPal</span>
                        </div>
                        <p className="text-sm text-c-slate-400 mb-6 leading-relaxed">
                            {REDIRECT_TEXT}
                        </p>
                        <div className="flex gap-2 mt-auto">
                            <Input placeholder="Enter Amount Here..." />
                            <Button>Pay Now</Button>
                        </div>
                    </div>

                    {/* 3. Stripe */}
                    <div className="relative p-5 bg-black rounded-[12px] border transition-all cursor-pointer border-white/10 hover:border-white/20">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl font-bold text-green">Stripe</span>
                        </div>
                        <p className="text-sm text-c-slate-400 mb-6 leading-relaxed">
                            {REDIRECT_TEXT}
                        </p>
                        <div className="flex gap-2 mt-auto">
                            <Input placeholder="Enter Amount Here..." />
                            <Button>Pay Now</Button>
                        </div>
                    </div>

                    {/* 4. Caution */}
                    <div className="p-5 bg-black rounded-[12px] border border-white/10 flex flex-col items-center text-center justify-center">
                        <h3 className="font-bold text-red mb-3">Caution!</h3>
                        <p className="text-sm text-c-slate-400 leading-relaxed">
                            {topUpSettings?.cautionText ?? "If you have any issues with payment, open a support ticket please. We are here 24/7."}
                        </p>
                    </div>

                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white/90">Transaction History</h2>
                        <div className="flex items-center gap-2">
                            <h6 className="text-sm text-c-slate-400">Payment Method:</h6>
                            <Select defaultValue="all" onValueChange={(value) => setSelectedTag(value)}>
                                <SelectTrigger className="w-[140px] h-9 text-xs font-medium border-white/10 bg-black/20 text-white">
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="crypto">Crypto</SelectItem>
                                    <SelectItem value="shkeeper">SHKeeper</SelectItem>
                                    <SelectItem value="paypal">PayPal</SelectItem>
                                    <SelectItem value="stripe">Stripe</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-sm text-c-slate-400 py-4">Loading transactions...</p>
                    ) : (
                        <ReusableTable
                            columns={transactionColumns}
                            data={filteredData}
                            currentPage={page}
                            setCurrentPage={setPage}
                            itemsPerPage={5}
                            totalItems={filteredData.length}
                        />
                    )}

                    <WalletModal
                        walletModalOpen={walletModalOpen}
                        setWalletModalOpen={setWalletModalOpen}
                        walletAddress={walletAddress}
                        payAmount={payAmount}
                        currency={selectedCoin}
                        usdAmount={Number(cryptoAmount)}
                        blankCurrencyText={topUpSettings?.blankCurrencyText}
                        generatedCurrencyText={topUpSettings?.generatedCurrencyText}
                    />
                </div>
            </div>
        </div>
    );
}