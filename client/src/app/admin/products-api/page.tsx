"use client";

import React, { useState, useEffect } from "react";
import { adminSettingsApi, apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check } from "lucide-react";



export interface ActionButtonsProps {
  onReset?: () => void;
  onSave?: () => void;
}

export interface SettingsCardProps extends ActionButtonsProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  saving?: boolean;
}

export interface FormRowProps {
  label?: string;
  children: React.ReactNode;
  alignItems?: "center" | "start";
}



const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  children,
  onReset,
  onSave,
  saving,
  className = "",
}) => (
  <div
    className={`bg-c-bg-700 border border-c-slate-800/60 rounded-lg overflow-hidden flex flex-col ${className}`}
  >
    {title && (
      <div className="px-4 py-2 border-b border-c-slate-800/60 bg-c-bg-700">
        <h3 className="text-c-slate-200 text-sm font-medium tracking-wide">
          {title}
        </h3>
      </div>
    )}
    <div className="p-4 flex-1 space-y-4">{children}</div>
    {(onReset || onSave) && (
      <div className="px-4 py-3 border-t border-c-slate-800/60 bg-c-bg-700 flex justify-end gap-3">
        {onReset && (
          <Button
            onClick={onReset}
            variant="secondary"
            disabled={saving}
            className="bg-c-red-500 hover:bg-c-red-400 text-white px-5 h-8 text-sm transition-colors"
          >
            Reset
          </Button>
        )}
        {onSave && (
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-c-green-500 hover:bg-c-green-600 text-white px-5 h-8 text-sm transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
    )}
  </div>
);

const FormRow: React.FC<FormRowProps> = ({
  label,
  children,
  alignItems = "center",
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-${alignItems} gap-2 sm:gap-4 w-full`}
  >
    {label && (
      <div className="w-full sm:w-28 shrink-0">
        <label className="text-sm font-medium text-c-slate-400">{label}</label>
      </div>
    )}
    <div className="flex-1 w-full">{children}</div>
  </div>
);

const PasswordInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        className="bg-c-bg-800 border-c-slate-700/50 text-c-slate-200 focus-visible:ring-c-emerald-500/50 pr-10 h-9 w-full text-sm [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#0f172a] [&:-webkit-autofill]:[webkit-text-fill-color:#e2e8f0]"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-c-slate-500 hover:text-c-slate-300 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

const CopyableInput = ({
  value,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        {...props}
        value={value}
        readOnly
        className="bg-c-bg-800 border-c-slate-700/50 text-c-slate-200 pr-10 h-9 w-full font-mono text-sm"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-c-slate-500 hover:text-c-emerald-400 transition-colors"
      >
        {copied ? (
          <Check size={14} className="text-c-emerald-500" />
        ) : (
          <Copy size={14} />
        )}
      </button>
    </div>
  );
};

const StyledInput = ({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <Input
    {...props}
    autoComplete="off"
    className={`bg-c-bg-800 border-c-slate-700/50 text-c-slate-200 focus-visible:ring-c-emerald-500/50 h-9 w-full text-sm [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#0f172a] [&:-webkit-autofill]:[webkit-text-fill-color:#e2e8f0] ${className}`}
  />
);



export default function ConfigurationPage() {
  const [socks5ApiKey, setSocks5ApiKey]         = useState("");
  const [socks5Commission, setSocks5Commission] = useState("");
  const [callbackSecret, setCallbackSecret]     = useState("");
  const [callbackUrl, setCallbackUrl]           = useState("");
  const [hostUrl, setHostUrl]                   = useState("");

  const [loading, setLoading]               = useState(true);
  const [savingSocks5, setSavingSocks5]     = useState(false);
  const [savingCallback, setSavingCallback] = useState(false);

  
  useEffect(() => {
    Promise.all([
      adminSettingsApi.getProductsApi(),
      apiFetch("/api/admin/pricing"),
      adminSettingsApi.getSettings(),
      apiFetch("/api/admin/callback"),
    ])
      .then(([productsRes, pricingRes, settingsRes, callbackRes]) => {
        setSocks5ApiKey(productsRes.data?.socks5Api?.apiKey || "");
        const commission = pricingRes.data?.socks5Proxy;
        setSocks5Commission(commission !== undefined ? String(commission) : "");
        const host   = settingsRes.data?.hostUrl || "";
        const secret = callbackRes.data?.secret  || "";
        setHostUrl(host);
        setCallbackSecret(secret);
        setCallbackUrl(host && secret ? `${host}/tools/callback?secret=${secret}` : "");
      })
      .catch((err) => console.error("Failed to load config:", err))
      .finally(() => setLoading(false));
  }, []);

  
  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCallbackSecret(val);
    setCallbackUrl(hostUrl && val ? `${hostUrl}/tools/callback?secret=${val}` : "");
  };

  
  const handleSaveSocks5 = async () => {
    setSavingSocks5(true);
    try {
      await Promise.all([
        adminSettingsApi.updateProductsApi({ socks5Api: { apiKey: socks5ApiKey } }),
        apiFetch("/api/admin/pricing", {
          method: "PUT",
          body: JSON.stringify({ socks5Proxy: Number(socks5Commission) || 0 }),
        }),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSocks5(false);
    }
  };

  
  const handleSaveCallback = async () => {
    setSavingCallback(true);
    try {
      await apiFetch("/api/admin/callback", {
        method: "PUT",
        body: JSON.stringify({ secret: callbackSecret }),
      });
      setCallbackUrl(hostUrl && callbackSecret ? `${hostUrl}/tools/callback?secret=${callbackSecret}` : "");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCallback(false);
    }
  };

  return (
    <div className="w-full bg-c-bg-900 p-3 md:p-4 font-sans rounded-[12px]">
      <div className="space-y-6">

        {}
        <div className="w-full">
          <SettingsCard
            title="Socks5 Proxy"
            onReset={() => { setSocks5ApiKey(""); setSocks5Commission(""); }}
            onSave={handleSaveSocks5}
            saving={savingSocks5}
          >
            <div className="space-y-3">
              <FormRow label="API Key">
                <PasswordInput
                  value={socks5ApiKey}
                  onChange={(e) => setSocks5ApiKey((e.target as HTMLInputElement).value)}
                  disabled={loading || savingSocks5}
                />
              </FormRow>
              <FormRow label="Commission">
                <div className="w-full sm:w-24">
                  <StyledInput
                    type="number"
                    value={socks5Commission}
                    onChange={(e) => setSocks5Commission((e.target as HTMLInputElement).value)}
                    disabled={loading || savingSocks5}
                  />
                </div>
              </FormRow>
            </div>
          </SettingsCard>
        </div>

        {}
        <div className="pt-6 mt-6 border-t border-c-slate-800/80">
          <SettingsCard
            title="Callback"
            onReset={() => { setCallbackSecret(""); setCallbackUrl(""); }}
            onSave={handleSaveCallback}
            saving={savingCallback}
          >
            <div className="space-y-3">
              <FormRow label="Callback Secret">
                <StyledInput
                  value={callbackSecret}
                  onChange={handleSecretChange}
                  disabled={loading || savingCallback}
                />
              </FormRow>
              <FormRow label="Callback URL">
                <CopyableInput value={callbackUrl} />
              </FormRow>
            </div>
          </SettingsCard>
        </div>

      </div>
    </div>
  );
}