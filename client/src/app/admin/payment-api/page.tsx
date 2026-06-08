"use client";

import { useState, useEffect } from "react";
import { PaymentApiProviderCard } from "@/components/admin/cards/PaymentApiProviderCard";
import { PaymentApiProvider, PaymentApiProviderConfigValues } from "@/types/admin/payment-api/payment-api-provider";
import { adminSettingsApi } from "@/lib/api";

const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL || "https://acc.repeatsms.com";

const buildProviders = (
  nowApiKey: string,
  nowSecret: string,
  yaanApiKey: string,
  yaanSecret: string,
  blockApiKey: string,
  blockSecret: string,
): PaymentApiProvider[] => [
  {
    id: "now-payments",
    name: "Now Payments",
    initialConfig: {
      apiKey: nowApiKey,
      callbackSecret: nowSecret,
      callbackUrl: `${HOST_URL}/top-up/callback?method=now-payments&secret=${nowSecret}`,
    },
  },
  {
    id: "yaan-pay",
    name: "SHKeeper",
    initialConfig: {
      apiKey: yaanApiKey,
      callbackSecret: yaanSecret,
      callbackUrl: `${HOST_URL}/top-up/callback?method=yaan-pay&secret=${yaanSecret}`,
    },
  },
  {
    id: "blockonomics",
    name: "Blockonomics",
    initialConfig: {
      apiKey: blockApiKey,
      callbackSecret: blockSecret,
      callbackUrl: `${HOST_URL}/top-up/callback?method=blockonomics&secret=${blockSecret}`,
    },
  },
];

export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState<PaymentApiProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("now-payments");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminSettingsApi.getPaymentApi()
      .then(({ data }) => {
        setProviders(buildProviders(
          data.nowPayments?.apiKey ?? "",
          data.nowPayments?.callbackSecret ?? "",
          data.yaanPay?.apiKey ?? "",
          data.yaanPay?.callbackSecret ?? "",
          data.blockonomics?.apiKey ?? "",
          data.blockonomics?.callbackSecret ?? "",
        ));
        setActiveProviderId(data.currentMethod || "now-payments");
      })
      .catch((err) => {
        console.error("Failed to load payment API config:", err);
        // Fall back to empty defaults so page still renders
        setProviders(buildProviders("", "", "", "", "", ""));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async (id: string, data: PaymentApiProviderConfigValues) => {
    if (id === "now-payments") {
      await adminSettingsApi.updatePaymentApi({
        nowPayments: { apiKey: data.apiKey, callbackSecret: data.callbackSecret },
        currentMethod: activeProviderId,
      });
    } else if (id === "yaan-pay") {
      await adminSettingsApi.updatePaymentApi({
        yaanPay: { apiKey: data.apiKey, callbackSecret: data.callbackSecret },
        currentMethod: activeProviderId,
      });
    } else if (id === "blockonomics") {
      await adminSettingsApi.updatePaymentApi({
        blockonomics: { apiKey: data.apiKey, callbackSecret: data.callbackSecret },
        currentMethod: activeProviderId,
      });
    }
    // Update local provider state so card shows the saved values
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, initialConfig: data } : p)),
    );
  };

  const handleToggleActive = async (id: string) => {
    setActiveProviderId(id);
    await adminSettingsApi.updatePaymentApi({ currentMethod: id }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 min-h-[88vh] rounded-[12px] bg-c-bg-850 flex items-center justify-center">
        <p className="text-c-slate-400">Loading payment config…</p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-6 min-h-[88vh] rounded-[12px] bg-c-bg-850 text-c-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Payment API Configurations
        </h1>
        <p className="text-c-slate-400 mt-1">
          Manage your callback secrets, API keys, and set your active payment gateway.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(min(100%,450px),1fr))]">
        {providers.map((provider) => (
          <PaymentApiProviderCard
            key={provider.id}
            provider={provider}
            isActive={activeProviderId === provider.id}
            onToggleActive={handleToggleActive}
            onSave={handleSaveConfig}
          />
        ))}
      </div>
    </div>
  );
}