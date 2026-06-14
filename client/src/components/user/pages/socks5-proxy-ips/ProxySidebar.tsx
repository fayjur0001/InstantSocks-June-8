"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Shuffle,
  ShoppingCart,
  Lock,
  Loader2,
} from "lucide-react";
import { ProxySidebarProps } from "@/types/user/socks5-proxy-ips";
import { randomStr, toFlagEmoji } from "@/lib/helpers";
import { proxyApi } from "@/lib/proxy.service";
import { toast } from "sonner";

const socks5Schema = z.object({
  username: z.string().min(3, "Min 3 characters"),
  password: z.string().min(6, "Min 6 characters"),
});
type Socks5Values = z.infer<typeof socks5Schema>;

function ProxySidebar({ proxy, cartCount, onShowCart }: ProxySidebarProps) {
  const [showUser, setShowUser] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const form = useForm<Socks5Values>({
    resolver: zodResolver(socks5Schema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      try {
        const res = await proxyApi.getAuth();
        if (res.success && res.auth) {
          form.setValue("username", res.auth.username);
          form.setValue("password", res.auth.password);
        }
      } catch {
        
      } finally {
        setAuthLoading(false);
      }
    })();
  
  }, []);

  const onSave = async (data: Socks5Values) => {
    setSaving(true);
    try {
      const res = await proxyApi.saveAuth(data.username, data.password);
      if (res.success) {
        setSaved(true);
        toast.success("Socks5 auth saved");
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error("Failed to save auth");
      }
    } catch {
      toast.error("Failed to save auth");
    } finally {
      setSaving(false);
    }
  };

  const handleRandom = () => {
    form.setValue("username", randomStr(8));
    form.setValue("password", randomStr(12));
  };

  return (
    <div className="flex flex-col h-full bg-c-bg-900 border-l border-c-slate-800/60 text-[13px]">

      {}
      <div className="px-4 pt-2 pb-2 border-b border-c-slate-800/60">
        <button
          onClick={onShowCart}
          className="flex items-center gap-2 w-full text-left group"
        >
          <ShoppingCart size={13} className="text-c-slate-500 shrink-0" />
          {cartCount === 0 ? (
            <span className="text-c-slate-500 font-medium">Cart Empty</span>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-c-emerald-500 font-bold">
                Cart {cartCount} {cartCount === 1 ? "Proxy" : "Proxies"}
              </span>
              <span className="ml-auto bg-c-emerald-600 group-hover:bg-c-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors uppercase tracking-tighter">
                Show
              </span>
            </div>
          )}
        </button>
      </div>

      {!proxy ? (
        <div className="flex-1 p-4">
          <p className="text-c-slate-500 italic">Click a proxy to view details</p>
          <div className="mt-8 border-t border-c-slate-800/40 pt-4">
            <p className="text-[11px] text-c-slate-600 mb-2">MyProxies</p>
            <div className="flex items-center gap-1.5 text-c-slate-700 text-[11px] font-mono bg-c-slate-900/30 p-2 rounded border border-c-slate-800/20">
              <Lock size={10} />
              <span>Select a proxy to see connection string</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {}
          <div className="p-4 border-b border-c-slate-800/60">
            <p className="text-[10px] text-c-emerald-500 uppercase tracking-[0.1em] font-bold mb-2">
              Info
            </p>
            <div className="space-y-1 text-c-slate-400 leading-relaxed">
              <p className="text-c-slate-100 font-bold text-[15px] flex items-center gap-1">
                {toFlagEmoji(proxy.countryCode)} {proxy.country}
              </p>
              <p className="text-[12px] opacity-80">{proxy.state}, {proxy.city}</p>

              <div className="grid grid-cols-1 gap-y-1 pt-1 border-t border-c-slate-800/40 mt-1">
                {proxy.domain && (
                  <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Domain</span> <span className="text-c-slate-300 font-mono truncate ml-4">{proxy.domain}</span></p>
                )}
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">ORG</span> <span className="text-c-slate-300 truncate ml-4">{proxy.org}</span></p>
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">ISP</span> <span className="text-c-slate-300 truncate ml-4">{proxy.isp}</span></p>
                {proxy.zone && (
                  <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Zone</span> <span className="text-c-slate-300 ml-4">{proxy.zone}</span></p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-y-1 pt-1 border-t border-c-slate-800/40 mt-1">
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Added</span> <span className="text-c-slate-300">{proxy.added}</span></p>
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Type</span> <span className="text-c-emerald-500 font-semibold">{proxy.type}</span></p>
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Ping</span> <span className="text-c-slate-300">{proxy.ping}ms</span></p>
                <p className="flex justify-between">
                  <span className="text-[11px] uppercase text-c-slate-500">Blacklisted</span>
                  <span className={proxy.blacklisted ? "text-c-red-400" : "text-c-emerald-400"}>
                    {proxy.blacklisted ? "Yes" : "No"}
                  </span>
                </p>
                {proxy.udp === true && (
                  <p className="flex justify-between items-center">
                    <span className="text-[11px] uppercase text-c-slate-500">UDP</span>
                    <span className="bg-c-emerald-500/15 text-c-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-c-emerald-500/30 uppercase tracking-wide">
                      Supported
                    </span>
                  </p>
                )}
                {proxy.rating !== undefined && (() => {
                  
                  const MAX_STARS = 5;
                  const displayRating = Math.min(MAX_STARS, Math.round(Number(proxy.rating)));
                  return (
                    <p className="flex justify-between items-center">
                      <span className="text-[11px] uppercase text-c-slate-500">Rating</span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= displayRating ? "text-c-emerald-400" : "text-c-slate-700"}
                            style={{ fontSize: "13px", lineHeight: 1 }}
                          >
                            ★
                          </span>
                        ))}
                      </span>
                    </p>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 gap-y-1 pt-1 border-t border-c-slate-800/40 mt-1">
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">IP</span> <span className="text-c-slate-300 font-mono">{proxy.ip}</span></p>
                <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Speed</span> <span className="text-c-slate-300">{proxy.speed}</span></p>
                {proxy.dns && (
                  <p className="flex justify-between">
                    <span className="text-[11px] uppercase text-c-slate-500">DNS</span>
                    <span className="text-c-slate-300">{toFlagEmoji(proxy.countryCode)} {proxy.dns}</span>
                  </p>
                )}
                {proxy.usage && (
                  <p className="flex justify-between"><span className="text-[11px] uppercase text-c-slate-500">Usage</span> <span className="text-c-slate-300">{proxy.usage}</span></p>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="p-4 border-b border-c-slate-800/60 bg-emerald-950/5">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart size={11} className="text-c-slate-500" />
              <span className="text-[11px] text-c-slate-500">MyProxies</span>
            </div>
            <div className="flex items-center gap-1.5 text-c-slate-500 bg-c-slate-900/60 rounded px-2 py-1.5">
              <Lock size={11} className="shrink-0" />
              <span className="font-mono text-[11px] break-all">
                {proxy.connectionString}
              </span>
            </div>
          </div>

          {}
          <div className="p-4">
            <p className="text-[10px] text-c-emerald-500 uppercase tracking-[0.1em] font-bold mb-2">
              Socks5 Auth
            </p>

            {authLoading ? (
              <div className="flex items-center gap-2 text-c-slate-500 py-4">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[12px]">Loading credentials…</span>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <p className="text-[11px] text-c-slate-500 mb-1 font-medium">Username</p>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showUser ? "text" : "password"}
                              placeholder="••••••••••••••"
                              className="bg-c-slate-900 border-c-slate-700/80 text-c-slate-200 text-[12px] h-8 pr-8 placeholder:text-c-slate-600 focus:border-c-emerald-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowUser((p) => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-c-slate-500 hover:text-c-slate-300 transition-colors"
                            >
                              {showUser ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px] text-c-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <p className="text-[11px] text-c-slate-500 mb-1 font-medium">Password</p>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPass ? "text" : "password"}
                              placeholder="••••••••••••••"
                              className="bg-c-slate-900 border-c-slate-700/80 text-c-slate-200 text-[12px] h-8 pr-8 placeholder:text-c-slate-600 focus:border-c-emerald-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass((p) => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-c-slate-500 hover:text-c-slate-300 transition-colors"
                            >
                              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px] text-c-red-400" />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRandom}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-c-slate-800/50 hover:bg-c-slate-800 text-c-slate-300 rounded-md transition-colors font-medium border border-c-slate-700/50"
                    >
                      <Shuffle size={11} />
                      Random
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] bg-c-emerald-600 hover:bg-c-emerald-500 disabled:opacity-60 text-white rounded-md transition-colors font-semibold"
                    >
                      {saving && <Loader2 size={11} className="animate-spin" />}
                      {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProxySidebar;