import { toFlagEmoji } from "@/lib/helpers";
import { ShoppingCart, Trash2, X, Loader2 } from "lucide-react";

// ProxyItem type — CartModal শুধু display করে,
// তাই full type import না করে inline define করলাম।
interface CartProxyItem {
  id: string;
  ip: string;
  countryCode: string;
  state: string;
  city: string;
  zip: string;
  price: number;
}

interface CartModalProps {
  items: CartProxyItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onBuyOne: (proxy: CartProxyItem) => void;
  onBuyAll: () => void;
  onEmpty: () => void;
  isLoading?: boolean; // buy loading state
}

function CartModal({
  items,
  onClose,
  onRemove,
  onBuyOne,
  onBuyAll,
  onEmpty,
  isLoading = false,
}: CartModalProps) {
  const total = items.reduce((sum, p) => sum + p.price, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-c-bg-850 border border-c-slate-700/60 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-c-slate-800/80">
          <h2 className="text-c-slate-200 font-semibold text-[15px]">Cart</h2>
          <button
            onClick={onClose}
            className="text-c-slate-500 hover:text-c-slate-300 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="px-6 py-4 min-h-[120px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-c-slate-600">
              <ShoppingCart size={28} />
              <p className="text-[13px]">Your cart is empty</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-c-slate-500 text-left">
                  <th className="pb-3 font-medium pr-4">IP</th>
                  <th className="pb-3 font-medium pr-4">Country</th>
                  <th className="pb-3 font-medium pr-4">State</th>
                  <th className="pb-3 font-medium pr-4">City</th>
                  <th className="pb-3 font-medium pr-4">Zip</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-c-slate-800/50">
                {items.map((proxy) => (
                  <tr key={proxy.id} className="group">
                    <td className="py-3 pr-4 text-c-slate-200 font-mono">
                      {toFlagEmoji(proxy.countryCode)} {proxy.ip}
                    </td>
                    <td className="py-3 pr-4 text-c-slate-400">
                      {proxy.countryCode}
                    </td>
                    <td className="py-3 pr-4 text-c-slate-400">{proxy.state}</td>
                    <td className="py-3 pr-4 text-c-slate-400">{proxy.city}</td>
                    <td className="py-3 pr-4 text-c-slate-400">{proxy.zip}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRemove(proxy.id)}
                          disabled={isLoading}
                          className="w-5 h-5 rounded-full bg-c-red-500/20 hover:bg-c-red-500 text-c-red-400 hover:text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
                          title="Remove"
                        >
                          <X size={10} />
                        </button>
                        <button
                          onClick={() => onBuyOne(proxy)}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-3 py-1 bg-c-emerald-600 hover:bg-c-emerald-500 disabled:opacity-60 text-white text-[11px] rounded-md font-semibold transition-colors whitespace-nowrap"
                        >
                          {isLoading && <Loader2 size={10} className="animate-spin" />}
                          Buy $ {proxy.price.toFixed(2)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-c-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-c-slate-300 bg-c-slate-800 hover:bg-c-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          {items.length > 0 && (
            <>
              <button
                onClick={onEmpty}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-c-red-400 bg-c-red-500/10 hover:bg-c-red-500/20 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Empty Cart
              </button>
              <button
                onClick={onBuyAll}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-c-emerald-600 hover:bg-c-emerald-500 disabled:opacity-60 rounded-lg transition-colors"
              >
                {isLoading && <Loader2 size={13} className="animate-spin" />}
                Buy All $ {total.toFixed(2)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartModal;