"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Search,
  RotateCcw,
  Tag,
  TrendingUp,
  ShieldCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  discountService,
  type BadgeTier,
  type DiscountTier,
  type DiscountUser,
} from "@/lib/discount.service";

// ─── Static color/style config ────────────────────────────────────────────────
const TIER_STYLES: Record<BadgeTier, { border: string; bg: string; text: string; badge: string; glow: string; dot: string; inputBorder: string; icon: string }> = {
  Basic: {
    border: "border-c-slate-700",
    bg: "bg-c-bg-700/60",
    text: "text-c-slate-300",
    badge: "bg-c-slate-800 text-c-slate-300 border border-c-slate-700",
    glow: "",
    dot: "bg-c-slate-500",
    inputBorder: "border-c-slate-600",
    icon: "⚪",
  },
  Bronze: {
    border: "border-c-amber-700/60",
    bg: "bg-c-bg-700/60",
    text: "text-c-amber-400",
    badge: "bg-c-amber-700/20 text-c-amber-400 border border-c-amber-700/50",
    glow: "shadow-[0_0_20px_rgba(180,83,9,0.15)]",
    dot: "bg-c-amber-500",
    inputBorder: "border-c-amber-700/60",
    icon: "🥉",
  },
  Silver: {
    border: "border-c-slate-500/60",
    bg: "bg-c-bg-700/60",
    text: "text-c-slate-200",
    badge: "bg-c-slate-600/20 text-c-slate-200 border border-c-slate-500/50",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.12)]",
    dot: "bg-c-slate-400",
    inputBorder: "border-c-slate-500/60",
    icon: "🥈",
  },
  Gold: {
    border: "border-c-yellow-400/50",
    bg: "bg-c-bg-700/60",
    text: "text-c-yellow-400",
    badge: "bg-c-yellow-400/10 text-c-yellow-400 border border-c-yellow-400/40",
    glow: "shadow-[0_0_20px_rgba(250,204,21,0.15)]",
    dot: "bg-c-yellow-400",
    inputBorder: "border-c-yellow-400/50",
    icon: "🥇",
  },
  Diamond: {
    border: "border-c-cyan-400/50",
    bg: "bg-c-bg-700/60",
    text: "text-c-cyan-400",
    badge: "bg-c-cyan-900/30 text-c-cyan-400 border border-c-cyan-400/40",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.18)]",
    dot: "bg-c-cyan-400",
    inputBorder: "border-c-cyan-400/40",
    icon: "💎",
  },
};

// ─── Badge Pill ───────────────────────────────────────────────────────────────
function BadgePill({ tier }: { tier: BadgeTier }) {
  const s = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${s.badge}`}
    >
      <span className="text-[10px]">{s.icon}</span>
      {tier}
    </span>
  );
}

// ─── Tier Card ────────────────────────────────────────────────────────────────
interface EditDraft { maxSpend: string; discount: string; }

interface TierCardProps {
  cfg:           DiscountTier;
  isEditing:     boolean;
  draft:         EditDraft;
  onEditStart:   () => void;
  onDraftChange: (field: keyof EditDraft, value: string) => void;
  onSave:        () => void;
  onCancel:      () => void;
}

function TierCard({ cfg, isEditing, draft, onEditStart, onDraftChange, onSave, onCancel }: TierCardProps) {
  const s         = TIER_STYLES[cfg.tier];
  const isDiamond = cfg.tier === "Diamond";
  const inputCls  = `h-7 w-full bg-c-bg-800 ${s.inputBorder} border text-[12px] text-c-slate-200 placeholder:text-c-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 rounded-md`;

  return (
    <div className={`relative rounded-xl border ${s.border} ${s.bg} ${s.glow} p-4 flex flex-col gap-3 backdrop-blur-sm transition-all duration-200`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl leading-none">{s.icon}</span>
          <span className={`text-sm font-bold ${s.text}`}>{cfg.tier}</span>
        </div>

        {/* Discount badge only — pencil removed from here */}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              className={`h-6 w-[60px] bg-c-bg-800 ${s.inputBorder} border text-[11px] font-bold text-center text-c-slate-200 px-1 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full`}
              value={draft.discount}
              onChange={(e) => onDraftChange("discount", e.target.value)}
              placeholder="%"
              type="number"
              min={0}
              max={100}
            />
            <span className="text-[11px] text-c-slate-400 font-bold">%</span>
          </div>
        ) : (
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${cfg.discount === 0 ? "bg-c-slate-800 text-c-slate-500 border border-c-slate-700" : s.badge}`}>
            {cfg.discount === 0 ? "No Discount" : `${cfg.discount}% OFF`}
          </span>
        )}
      </div>

      <div className="h-px w-full bg-white/5" />

      {/* Spend Range */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-c-slate-500 shrink-0" />
          <span className="text-[11px] text-c-slate-500 font-medium uppercase tracking-wide">Spend Range</span>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <span className={`text-[12px] font-semibold ${s.text} shrink-0`}>${cfg.minSpend.toLocaleString()}</span>
            {!isDiamond && (
              <>
                <span className="text-c-slate-500 text-[11px] shrink-0">–</span>
                <Input className={inputCls} value={draft.maxSpend} onChange={(e) => onDraftChange("maxSpend", e.target.value)} placeholder="Max $" type="number" min={0} step={1} />
              </>
            )}
            {isDiamond && <span className={`text-[12px] font-semibold ${s.text} shrink-0`}>+</span>}
          </div>
        ) : (
          <span className={`text-[13px] font-semibold ${s.text}`}>
            {cfg.maxSpend === null ? `$${cfg.minSpend.toLocaleString()}+` : `$${cfg.minSpend.toLocaleString()} – $${cfg.maxSpend.toLocaleString()}`}
          </span>
        )}
      </div>

      {/* Purchase Discount — pencil/save/cancel এখন এখানে */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-c-slate-500 shrink-0" />
          <span className="text-[11px] text-c-slate-500 font-medium uppercase tracking-wide">Purchase Discount</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] font-semibold ${s.text}`}>
            {isEditing
              ? draft.discount ? `${draft.discount}% on each purchase` : "None"
              : cfg.discount === 0 ? "None" : `${cfg.discount}% on each purchase`}
          </span>

          {/* Pencil / Save / Cancel */}
          {isEditing ? (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onSave} className="flex items-center justify-center w-6 h-6 rounded-md bg-c-emerald-700/30 hover:bg-c-emerald-700/60 border border-c-emerald-600/40 transition-colors" title="Save">
                <Check className="w-3 h-3 text-c-emerald-400" />
              </button>
              <button onClick={onCancel} className="flex items-center justify-center w-6 h-6 rounded-md bg-c-rose-500/10 hover:bg-c-rose-500/25 border border-c-rose-500/20 transition-colors" title="Cancel">
                <X className="w-3 h-3 text-c-rose-400" />
              </button>
            </div>
          ) : (
            <button onClick={onEditStart} className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0" title="Edit tier">
              <Pencil className="w-3 h-3 text-c-slate-400" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDiscountPage() {
  // ── Tiers state ──────────────────────────────────────────────────────────────
  const [tiers,        setTiers]        = useState<DiscountTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [editingTier,  setEditingTier]  = useState<BadgeTier | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [draft,        setDraft]        = useState<EditDraft>({ maxSpend: "", discount: "" });

  // ── Users state ───────────────────────────────────────────────────────────────
  const [users,          setUsers]          = useState<DiscountUser[]>([]);
  const [usersLoading,   setUsersLoading]   = useState(true);
  const [totalPage,      setTotalPage]      = useState(1);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchBadge,    setSearchBadge]    = useState<string>("all");
  const [page,           setPage]           = useState(1);

  // ── Fetch tiers on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    discountService.getTiers()
      .then((res) => setTiers(res.tiers))
      .catch(() => toast.error("Failed to load discount tiers."))
      .finally(() => setTiersLoading(false));
  }, []);

  // ── Fetch users whenever filters/page change ──────────────────────────────────
  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    discountService
      .getUsers({ page, limit: 10, username: searchUsername || undefined, badge: searchBadge })
      .then((res) => {
        setUsers(res.users);
        setTotalPage(res.totalPage);
      })
      .catch(() => toast.error("Failed to load users."))
      .finally(() => setUsersLoading(false));
  }, [page, searchUsername, searchBadge]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Tier edit handlers ────────────────────────────────────────────────────────
  const handleEditStart = useCallback((cfg: DiscountTier) => {
    setEditingTier(cfg.tier);
    setDraft({
      maxSpend: cfg.maxSpend === null ? "" : String(cfg.maxSpend),
      discount: String(cfg.discount),
    });
  }, []);

  const handleDraftChange = useCallback((field: keyof EditDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async (tier: BadgeTier) => {
    const rawMax      = draft.maxSpend;
    const maxVal      = rawMax === "" ? null : parseInt(rawMax, 10);
    const discountVal = parseFloat(draft.discount);

    if (tier !== "Diamond" && rawMax !== "" && rawMax.includes(".")) {
      toast.error("Max spend must be a whole number (no decimals)"); return;
    }
    if (tier !== "Diamond" && (maxVal === null || isNaN(maxVal) || maxVal < 0)) {
      toast.error("Max spend must be a valid number ≥ 0"); return;
    }
    if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) {
      toast.error("Discount must be between 0 and 100"); return;
    }

    // Optimistic update
    const prev = tiers;
    setTiers((ts) => {
      const idx     = ts.findIndex((t) => t.tier === tier);
      const current = ts[idx];
      if (tier !== "Diamond" && maxVal !== null && current.minSpend >= maxVal) {
        toast.error(`${tier}: Min ($${current.minSpend.toLocaleString()}) must be less than Max ($${maxVal.toLocaleString()})`);
        return ts;
      }
      const updated = ts.map((t, i) => i === idx ? { ...t, maxSpend: maxVal, discount: discountVal } : t);
      if (maxVal !== null) {
        const nextIdx = idx + 1;
        if (nextIdx < updated.length) {
          const nextTier    = updated[nextIdx];
          const cascadedMin = maxVal + 1;
          if (nextTier.maxSpend !== null && cascadedMin >= nextTier.maxSpend) {
            toast.error(`${nextTier.tier} min would become $${cascadedMin.toLocaleString()} but its max is $${nextTier.maxSpend.toLocaleString()}. Update ${nextTier.tier} max first.`);
            return ts;
          }
          updated[nextIdx] = { ...nextTier, minSpend: cascadedMin };
        }
      }
      return updated;
    });
    setEditingTier(null);

    // API call
    setSaving(true);
    try {
      await discountService.updateTier(tier, {
        maxSpend: tier === "Diamond" ? null : maxVal,
        discount: discountVal,
      });
      toast.success(`${tier} tier updated`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save tier.");
      setTiers(prev); // rollback
    } finally {
      setSaving(false);
    }
  }, [draft, tiers, fetchUsers]);

  const handleCancel = useCallback(() => setEditingTier(null), []);

  const handleReset = useCallback(() => {
    setSearchUsername("");
    setSearchBadge("all");
    setPage(1);
  }, []);

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DiscountUser, unknown>[]>(() => [
    {
      accessorKey: "userId",
      header: "USER ID",
      cell: ({ row }) => (
        <span className="font-mono text-c-slate-400 text-[12px]">{row.original.userId}</span>
      ),
    },
    {
      accessorKey: "username",
      header: "USERNAME",
      cell: ({ row }) => (
        <span className="text-c-slate-200 font-medium text-[13px]">{row.original.username}</span>
      ),
    },
    {
      accessorKey: "totalTopUp",
      header: "TOTAL TOP-UP",
      cell: ({ row }) => (
        <span className="text-c-emerald-400 font-semibold text-[13px]">
          ${row.original.totalTopUp.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "totalSpend",
      header: "TOTAL SPEND",
      cell: ({ row }) => (
        <span className="text-c-cyan-400 font-semibold text-[13px]">
          ${row.original.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "badge",
      header: "BADGE",
      cell: ({ row }) => <BadgePill tier={row.original.badge} />,
    },
  ], []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full">

      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-c-emerald-900/40 border border-c-emerald-700/30">
          <Tag className="w-4 h-4 text-c-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-c-slate-100 leading-tight">
            Discount &amp; Badge Tiers
          </h1>
          <p className="text-xs text-c-slate-500 mt-0.5">
            Discounts are automatically applied to purchases based on all-time top-up.
            Click the <Pencil className="inline w-3 h-3 mb-0.5" /> icon on any card to edit thresholds and discount %.
          </p>
        </div>
      </div>

      {/* Tier Cards */}
      {tiersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-c-slate-700 bg-c-bg-700/60 p-4 h-[160px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {tiers.map((cfg) => (
            <TierCard
              key={cfg.tier}
              cfg={cfg}
              isEditing={editingTier === cfg.tier}
              draft={draft}
              onEditStart={() => handleEditStart(cfg)}
              onDraftChange={handleDraftChange}
              onSave={() => handleSave(cfg.tier)}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-c-bg-700 border border-c-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-c-slate-200 tracking-wide">All Users</h2>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-c-slate-500" />
              <Input
                placeholder="Search username..."
                value={searchUsername}
                onChange={(e) => { setSearchUsername(e.target.value); setPage(1); }}
                className="pl-8 bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500 h-9 text-[13px]"
              />
            </div>

            <Select value={searchBadge} onValueChange={(val) => { setSearchBadge(val); setPage(1); }}>
              <SelectTrigger className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 h-9 w-[140px] text-[13px]">
                <SelectValue placeholder="All Badges" />
              </SelectTrigger>
              <SelectContent className="bg-c-bg-700 border-c-slate-700 text-c-slate-200">
                <SelectItem value="all">All Badges</SelectItem>
                {tiers.map((cfg) => (
                  <SelectItem key={cfg.tier} value={cfg.tier}>
                    <span className="flex items-center gap-1.5">
                      <span>{TIER_STYLES[cfg.tier].icon}</span>
                      {cfg.tier}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleReset} variant="ghost" size="sm" className="h-9 px-3 bg-c-rose-500/10 text-c-rose-500 hover:bg-c-rose-500/20 border border-c-rose-500/20 shadow-none">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>

        <ReusableTable
          columns={columns}
          data={users}
          currentPage={page}
          setCurrentPage={setPage}
          itemsPerPage={10}
          totalItems={totalPage * 10}
          isLoading={usersLoading}
        />
      </div>
    </div>
  );
}