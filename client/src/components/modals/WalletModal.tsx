import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState, useEffect } from "react";

interface WalletModalProps {
    walletModalOpen: boolean;
    setWalletModalOpen: (open: boolean) => void;
    walletAddress?: string;
    payAmount?: number | null;
    currency?: string;
    usdAmount?: number;
}

export default function WalletModal({
    walletModalOpen,
    setWalletModalOpen,
    walletAddress,
    payAmount,
    currency,
    usdAmount,
}: WalletModalProps) {
    const [timeLeft, setTimeLeft] = useState<string>("01:59:59");

    useEffect(() => {
        if (!walletModalOpen) return;
        let remainingSeconds = 2 * 3600;
        const interval = setInterval(() => {
            remainingSeconds -= 1;
            if (remainingSeconds <= 0) {
                clearInterval(interval);
                setTimeLeft("00:00:00");
                return;
            }
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.floor((remainingSeconds % 3600) / 60);
            const seconds = remainingSeconds % 60;
            setTimeLeft(
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            );
        }, 1000);
        return () => clearInterval(interval);
    }, [walletModalOpen]);

    const displayAddress = walletAddress || "0x742dffadf3545dCc...954df56fffg632";
    const displayAmount = payAmount != null ? payAmount : null;
    const displayCurrency = currency?.toUpperCase() ?? "BTC";
    const displayUsd = usdAmount != null ? usdAmount.toFixed(2) : null;

    return (
        <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
            <DialogContent
                size="lg"
                className="sm:max-w-141 overflow-hidden max-h-[90vh] overflow-y-auto hide-scrollbar shadow-lg shadow-white/10 p-4 border border-white/20 bg-c-bg-700"
                isCloseHide={true}
            >
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5">
                    <DialogTitle asChild>
                        <h5 className="heading-h5-semibold text-start text-white">
                            {displayCurrency} Payment
                        </h5>
                    </DialogTitle>
                    <span className="text-2xl font-bold text-green">
                        {displayUsd ? `$${displayUsd}` : "$0.00"}
                    </span>
                </DialogHeader>

                <div className="flex items-center justify-center gap-2 py-3 mb-2 rounded-lg bg-c-emerald-500/10 border border-c-emerald-500/30">
                    <span className="text-sm font-medium text-c-emerald-400">Time Left:</span>
                    <span className="text-lg font-mono font-bold text-c-emerald-400">{timeLeft}</span>
                </div>

                <div className="flex flex-col items-center text-center space-y-1 mb-2">
                    {displayAmount != null && (
                        <p className="text-sm font-semibold text-white">
                            Send exactly{" "}
                            <span className="text-c-emerald-400">
                                {displayAmount} {displayCurrency}
                            </span>
                        </p>
                    )}
                    <p className="text-[15px] text-c-slate-400 font-medium leading-relaxed">
                        Send exactly (Generated Amount with copy function) {displayCurrency} to this address.
                    </p>
                    <p className="text-[15px] text-c-slate-400 font-medium leading-relaxed">
                        Overpay or Under pay invoice may cause lost of asset.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-0 bg-black/40 rounded-xl p-1 border border-white/5">
                    <div className="flex-1 px-4 py-2 text-c-slate-300 font-medium truncate text-sm">
                        <span>{displayAddress}</span>
                    </div>
                    <Button
                        className="px-8"
                        onClick={() => navigator.clipboard.writeText(displayAddress)}
                    >
                        Copy Wallet Address
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}