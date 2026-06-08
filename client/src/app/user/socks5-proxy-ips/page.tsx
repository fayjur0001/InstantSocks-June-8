"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ProxySidebar from "@/components/user/pages/socks5-proxy-ips/ProxySidebar";
import CartModal from "@/components/modals/CartModal";
import { COUNTRY_REGION_MAP, REGION_LABELS, REGION_ORDER, COUNTRY_NAMES } from "@/components/user/pages/socks5-proxy-ips/Data";
import { FilterState, ProxyItem, ProxyTypeTab } from "@/types/user/socks5-proxy-ips";
import ProxyTable from "@/components/user/pages/socks5-proxy-ips/ProxyTable";
import RegionSelector from "@/components/user/pages/socks5-proxy-ips/RegionSelector";
import CountrySelector from "@/components/user/pages/socks5-proxy-ips/CountrySelector";
import TypeFilter from "@/components/user/pages/socks5-proxy-ips/TypeFilter";
import { proxyApi, type ProxyListItem, type CartItem } from "@/lib/proxy.service";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DynamicRegion {
  id: string;
  label: string;
  count: number;
}

interface DynamicCountry {
  code: string;
  name: string;
  count: number;
  regionId: string;
}

interface DynamicState {
  state: string;  // e.g. "TX"
  count: number;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

function toProxyItem(p: ProxyListItem): ProxyItem & { originalPrice?: number } {
  return {
    id: p.id,
    ip: p.ip,
    domain: p.domain,
    countryCode: p.countryCode,
    country: p.country,
    state: p.state,
    city: p.city,
    isp: p.isp,
    zip: p.zip,
    speed: p.speed,
    ping: p.ping,
    type: p.type,
    added: p.added,
    price: p.price,
    originalPrice: p.originalPrice,
    org: p.org,
    zone: p.zone,
    dns: p.dns,
    blacklisted: p.blacklisted,
    usage: p.usage,
    connectionString: p.connectionString,
  };
}

type CartDbIdMap = Map<string, number>;

const EMPTY_FILTERS: FilterState = {
  ip: "", domain: "", state: "", city: "", isp: "", zip: "", type: "",
};

const ITEMS_PER_PAGE = 20;

export default function ProxyBrowser() {
  const { refreshBalance } = useAuth();

  // ── Region / Country / State state ─────────────────────────────────────────
  const [activeRegion, setActiveRegion] = useState<string>("usa");
  const [activeCountry, setActiveCountry] = useState<string>("US");
  const [activeState, setActiveState] = useState<string>("");   // USA states
  const [typeTab, setTypeTab] = useState<ProxyTypeTab>("all");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // ── Dynamic data from API ───────────────────────────────────────────────────
  const [regions, setRegions] = useState<DynamicRegion[]>([]);
  const [countries, setCountries] = useState<DynamicCountry[]>([]);
  const [usaStates, setUsaStates] = useState<DynamicState[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);

  // ── Proxy list state ────────────────────────────────────────────────────────
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [totalProxies, setTotalProxies] = useState(0);
  const [loadingProxies, setLoadingProxies] = useState(false);

  // ── Cart state ──────────────────────────────────────────────────────────────
  const [selectedProxy, setSelectedProxy] = useState<ProxyItem | null>(null);
  const [cart, setCart] = useState<ProxyItem[]>([]);
  const [cartDbIds, setCartDbIds] = useState<CartDbIdMap>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load countries from API on mount ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const res = await proxyApi.getCountries();
        if (!res.success) return;

        // NSocks country list → DynamicCountry[] with region mapping
        const dynamicCountries: DynamicCountry[] = [];
        const regionCountMap: Record<string, number> = {};

        for (const c of res.countries) {
          const code = c.ct.toUpperCase();
          const regionId = COUNTRY_REGION_MAP[code];
          if (!regionId) continue; // unknown country — skip

          dynamicCountries.push({
            code,
            name: COUNTRY_NAMES[code] ?? code,
            count: c.online,
            regionId,
          });

          // region count জমা করছি
          regionCountMap[regionId] = (regionCountMap[regionId] ?? 0) + c.online;
        }

        // USA টা আলাদা — NSocks countries-এ US আসলে সেটার count region count হিসেবে রাখি
        const usEntry = dynamicCountries.find((c) => c.code === "US");
        if (usEntry) {
          regionCountMap["usa"] = usEntry.count;
        }

        // Build regions with dynamic counts — filter count 0, sort by count desc then alphabetically
        const dynamicRegions: DynamicRegion[] = REGION_ORDER.map((id) => ({
          id,
          label: REGION_LABELS[id] ?? id,
          count: regionCountMap[id] ?? 0,
        }))
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); // count না থাকলে নেই

        setCountries(dynamicCountries);
        setRegions(dynamicRegions);
      } catch {
        toast.error("Failed to load country list");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // ── Load USA states when USA region selected ────────────────────────────────
  useEffect(() => {
    if (activeRegion !== "usa") {
      setUsaStates([]);
      return;
    }
    (async () => {
      setLoadingStates(true);
      try {
        const res = await proxyApi.getStates();
        if (res.success) {
          // count > 0 এবং sort alphabetically by state name
          const sorted = res.states
            .filter((s) => s.count > 0)
            .sort((a, b) => a.state.localeCompare(b.state));
          setUsaStates(sorted);
        }
      } catch {
        // silent — states না আসলেও "All USA" দিয়ে চলবে
      } finally {
        setLoadingStates(false);
      }
    })();
  }, [activeRegion]);

  // ── Countries for active region — alphabetically by name ───────────────────
  const regionCountries = useMemo(
    () =>
      countries
        .filter((c) => c.regionId === activeRegion)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [countries, activeRegion]
  );

  // ── Region change → reset country & state ──────────────────────────────────
  useEffect(() => {
    const first = regionCountries[0];
    if (first) setActiveCountry(first.code);
    setActiveState("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion]);

  // ── Fetch proxy list ────────────────────────────────────────────────────────
  const fetchProxies = useCallback(
    async (
      country: string,
      region: string,
      state: string,
      tab: ProxyTypeTab,
      f: FilterState,
      p: number
    ) => {
      setLoadingProxies(true);
      try {
        const typeParam =
          tab === "hosting" ? "DCH" :
          tab === "residential" ? "RESIDENTIAL" :
          tab === "non-backlisted" ? "" :
          f.type || "";

        const countryParam = region === "usa" ? "US" : country;

        const res = await proxyApi.getList({
          country:       countryParam,
          type:          typeParam || undefined,
          // state filter: USA-তে activeState, অন্যত্র f.state
          state:         region === "usa" ? (state || f.state || undefined) : (f.state || undefined),
          excludeBlacks: tab === "non-backlisted" ? true : undefined,
          page:          p,
          limit:         ITEMS_PER_PAGE,
        });

        if (res.success) {
          const match = (val: string, filter: string) =>
            !filter || val.toLowerCase().includes(filter.toLowerCase());

          const filtered = res.proxies
            .filter((pr) => {
              if (tab === "non-backlisted" && pr.blacklisted) return false;
              return (
                match(pr.ip, f.ip) &&
                match(pr.domain ?? "", f.domain) &&
                match(pr.city, f.city) &&
                match(pr.isp, f.isp) &&
                match(pr.zip, f.zip)
              );
            })
            .map(toProxyItem);

          setProxies(filtered);
          setTotalProxies(res.total);
        }
      } catch {
        toast.error("Failed to load proxy list");
      } finally {
        setLoadingProxies(false);
      }
    },
    []
  );

  // ── Trigger fetch when country/state/tab/page changes ──────────────────────
  useEffect(() => {
    fetchProxies(activeCountry, activeRegion, activeState, typeTab, filters, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountry, activeRegion, activeState, typeTab, page]);

  // ── Debounced filter change ─────────────────────────────────────────────────
  const setFilter = useCallback(
    (key: keyof FilterState, val: string) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: val };
        if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
        filterDebounceRef.current = setTimeout(() => {
          setPage(1);
          fetchProxies(activeCountry, activeRegion, activeState, typeTab, next, 1);
        }, 600);
        return next;
      });
    },
    [activeCountry, activeRegion, activeState, typeTab, fetchProxies]
  );

  // ── State click handler (USA only) ─────────────────────────────────────────
  const handleStateClick = useCallback((stateCode: string) => {
    // same state click → deselect (All USA)
    const next = activeState === stateCode ? "" : stateCode;
    setActiveState(next);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    fetchProxies("US", "usa", next, typeTab, EMPTY_FILTERS, 1);
  }, [activeState, typeTab, fetchProxies]);

  // ── Country click handler ───────────────────────────────────────────────────
  const handleCountryClick = useCallback((code: string) => {
    setActiveCountry(code);
    setActiveState("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  // ── Load cart on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await proxyApi.getCart();
        if (!res.success || res.items.length === 0) return;

        const dbIdMap: CartDbIdMap = new Map(
          res.items.map((item: CartItem) => [item.proxyId, item.id])
        );
        setCartDbIds(dbIdMap);

        // NSocks থেকে প্রতিটা proxy-র details আনো (parallel)
        const cartProxies: ProxyItem[] = await Promise.all(
          res.items.map(async (item: CartItem) => {
            try {
              const detail = await proxyApi.getDetails(item.proxyId);
              if (detail.success) {
                return toProxyItem({
                  ...detail.proxy,
                  price:         item.price,         // markup price রাখো
                  originalPrice: item.originalPrice,
                });
              }
            } catch {}
            // fallback — details না আসলে proxyId দিয়ে placeholder
            return {
              id: item.proxyId, ip: item.proxyId,
              domain: "", countryCode: "", country: "", state: "", city: "",
              isp: "", zip: "", speed: "", ping: 0, type: "", added: "",
              price: item.price, originalPrice: item.originalPrice,
              org: "", zone: "", dns: "", blacklisted: false, usage: "",
              connectionString: "",
            } as ProxyItem;
          })
        );

        setCart(cartProxies);
      } catch { /* silent */ }
    })();
  }, []);

  const addToCart = useCallback(async (proxy: ProxyItem) => {
    if (cart.some((p) => p.id === proxy.id)) return;
    setCart((prev) => [...prev, proxy]);
    try {
      const originalPrice = (proxy as ProxyItem & { originalPrice?: number }).originalPrice ?? proxy.price;
      const res = await proxyApi.addToCart(proxy.id, proxy.price, originalPrice);
      if (res.success) {
        setCartDbIds((prev) => new Map(prev).set(proxy.id, res.item.id));
        toast.success("Added to cart");
      } else {
        setCart((prev) => prev.filter((p) => p.id !== proxy.id));
        toast.error("Could not add to cart");
      }
    } catch (err: any) {
      if (!err?.message?.includes("409")) {
        setCart((prev) => prev.filter((p) => p.id !== proxy.id));
        toast.error("Could not add to cart");
      }
    }
  }, [cart]);

  const removeFromCart = useCallback(async (proxyId: string) => {
    const dbId = cartDbIds.get(proxyId);
    setCart((prev) => prev.filter((p) => p.id !== proxyId));
    setCartDbIds((prev) => { const next = new Map(prev); next.delete(proxyId); return next; });
    if (dbId) {
      try { await proxyApi.removeFromCart(dbId); } catch { /* silent */ }
    }
  }, [cartDbIds]);

  const emptyCart = useCallback(async () => {
    const currentCart = [...cart];
    const currentDbIds = new Map(cartDbIds);
    setCart([]);
    setCartDbIds(new Map());
    try {
      await Promise.all(
        currentCart.map((p) => {
          const dbId = currentDbIds.get(p.id);
          return dbId ? proxyApi.removeFromCart(dbId) : Promise.resolve();
        })
      );
    } catch { /* silent */ }
  }, [cart, cartDbIds]);

  const buyOne = useCallback(async (proxy: ProxyItem) => {
    setBuyLoading(true);
    try {
      const res = await proxyApi.rent([proxy.id]);
      if (res.success) {
        toast.success(`Proxy ${proxy.ip} purchased!`);
        removeFromCart(proxy.id);
        if (cart.length === 1) setShowCart(false);
        await refreshBalance();
      } else {
        toast.error("Purchase failed");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      toast.error(msg.includes("402") ? "Insufficient balance" : "Purchase failed");
    } finally {
      setBuyLoading(false);
    }
  }, [cart.length, removeFromCart, refreshBalance]);

  const buyAll = useCallback(async () => {
    if (cart.length === 0) return;
    setBuyLoading(true);
    try {
      const res = await proxyApi.rent(cart.map((p) => p.id));
      if (res.success) {
        toast.success(`${cart.length} proxies purchased!`);
        setCart([]);
        setCartDbIds(new Map());
        setShowCart(false);
        await refreshBalance();
      } else {
        toast.error("Purchase failed");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      toast.error(msg.includes("402") ? "Insufficient balance" : "Purchase failed");
    } finally {
      setBuyLoading(false);
    }
  }, [cart, refreshBalance]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-c-bg-900 text-c-slate-300">

      <div className="bg-c-bg-900 border-b border-c-slate-800/60 p-4 space-y-4">

        {/* Region Selector — dynamic counts */}
        {loadingMeta ? (
          <div className="flex flex-wrap gap-2">
            {[120, 100, 110, 90, 80, 70].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-c-slate-800/50 animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : (
          <RegionSelector
            regions={regions}
            activeRegion={activeRegion}
            setActiveRegion={setActiveRegion}
          />
        )}

        {/* USA: State selector */}
        {activeRegion === "usa" && (
          <div className="pt-4 border-t border-c-slate-800/40">
            {loadingStates ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-16 rounded-md bg-c-slate-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : usaStates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {/* All USA button */}
                <button
                  onClick={() => handleStateClick("")}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 border ${
                    activeState === ""
                      ? "bg-c-emerald-600/20 text-c-emerald-400 border-c-emerald-500/50"
                      : "bg-c-slate-900/30 text-c-slate-500 border-c-slate-800/50 hover:bg-c-slate-800 hover:text-c-slate-300"
                  }`}
                >
                  All
                </button>
                {usaStates.map((s) => (
                  <button
                    key={s.state}
                    onClick={() => handleStateClick(s.state)}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 border ${
                      activeState === s.state
                        ? "bg-c-emerald-600/20 text-c-emerald-400 border-c-emerald-500/50"
                        : "bg-c-slate-900/30 text-c-slate-500 border-c-slate-800/50 hover:bg-c-slate-800 hover:text-c-slate-300"
                    }`}
                  >
                    {s.state} - {s.count}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Country Selector — non-USA regions */}
        {activeRegion !== "usa" && (
          <CountrySelector
            regionCountries={regionCountries}
            setActiveCountry={handleCountryClick}
            setFilters={setFilters}
            setPage={setPage}
            activeCountry={activeCountry}
            EMPTY_FILTERS={EMPTY_FILTERS}
          />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <TypeFilter
          setTypeTab={setTypeTab}
          typeTab={typeTab}
          setFilters={setFilters}
          setPage={setPage}
          EMPTY_FILTERS={EMPTY_FILTERS}
        />

        {loadingProxies && (
          <div className="h-0.5 w-full bg-c-slate-800 overflow-hidden">
            <div className="h-full bg-c-emerald-500 animate-pulse w-full" />
          </div>
        )}

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          <ProxyTable
            filters={filters}
            setFilters={setFilters}
            setFilter={setFilter}
            filteredProxies={proxies}
            selectedProxy={selectedProxy}
            setSelectedProxy={setSelectedProxy}
            cart={cart}
            addToCart={addToCart}
            totalItems={totalProxies}
            currentPage={page}
            setCurrentPage={setPage}
            isLoading={loadingProxies}
          />

          <div className="w-full lg:w-[280px] shrink-0 sticky top-20 self-start h-auto">
            <ProxySidebar
              proxy={selectedProxy}
              cartCount={cart.length}
              onShowCart={() => setShowCart(true)}
            />
          </div>
        </div>
      </div>

      {showCart && (
        <CartModal
          items={cart}
          onClose={() => setShowCart(false)}
          onRemove={removeFromCart}
          onBuyOne={buyOne}
          onBuyAll={buyAll}
          onEmpty={emptyCart}
          isLoading={buyLoading}
        />
      )}
    </div>
  );
}