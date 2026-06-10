"use client";

import React, { useState, useRef, useEffect } from "react";
import { adminSettingsApi } from "@/lib/api";
import dynamic from "next/dynamic";
import {
  Globe,
  Power,
  Wrench,
  ShieldCheck,
  Coins,
  ImageIcon,
  Bell,
  FileText,
  Upload,
  Save,
  RotateCcw,
} from "lucide-react";

// shadcn/ui components
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
// import { toast } from "sonner";

// Rich text editor (loaded client-side only to avoid SSR issues)
import "react-quill-new/dist/quill.snow.css";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface MaintenanceSettings {
  text: string;
  hours: number;
}

interface AuthSettings {
  copyrightText: string;
  signInText: string;
  signUpText: string;
  passwordResetText: string;
  homeUrl: string;
}

interface TopUpSettings {
  cryptoText: string;
  blankCurrencyText: string;
  generatedCurrencyText: string;
  cautionText: string;
  popUpText: string;
}

interface SiteSettings {
  hostUrl: string;
  siteStatus: "online" | "offline";
  siteLogo: string | null;
  maintenance: MaintenanceSettings;
  authInfo: AuthSettings;
  topUp: TopUpSettings;
  notice: string;
  rules: string;
  termsAndConditions: string;
  privacyPolicy: string;
}

// ─────────────────────────────────────────────
// DEFAULT VALUES
// ─────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettings = {
  hostUrl: "https://acc.repeatsms.com",
  siteStatus: "online",
  siteLogo: null,
  maintenance: {
    text: "Site is undergoing maintenance",
    hours: 3,
  },
  authInfo: {
    copyrightText: "© 2014-${year} RepeatSMS. All Rights Reserved",
    signInText: "Access your account with your secure login",
    signUpText: "We're excited to have you onboard, let's get started!",
    passwordResetText: "Lost your password? No problem. Just enter your email below.",
    homeUrl: "https://repeatsms.com/",
  },
  topUp: {
    cryptoText: "Insert your deposit amount and click on Get wallet button",
    blankCurrencyText: "Your generated address will be shown here.",
    generatedCurrencyText: "Send exactly ${amount} ${currency} to this address.",
    cautionText: "If you have any issues with payment, open a support ticket.",
    popUpText: "## Claim Your Deposit Bonus Today.\nBoost your balance instantly.",
  },
  notice: "<p>CURRENT DISCOUNT: 20% off Phone and Proxy rentals till 30th April!</p>",
  rules: "<p><strong>Socks5</strong>: It is forbidden to violate the following rules.</p>",
  termsAndConditions: "<h2>Terms and Conditions</h2><p>Please read these terms and conditions carefully before using our service.</p>",
  privacyPolicy: "<h2>Privacy Policy</h2><p>We are committed to protecting your privacy. This policy explains how we collect and use your data.</p>",
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function SettingsPage() {
  // All site settings stored in one state object
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  // Ref used to trigger the hidden file input for logo uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers for updating state ──────────────

  /** Update a top-level field (e.g. hostUrl, siteStatus) */
  function updateField<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  /** Update a nested field (e.g. maintenance.text, authInfo.homeUrl) */
  function updateNestedField<
    K extends "maintenance" | "authInfo" | "topUp",
    F extends keyof SiteSettings[K]
  >(group: K, field: F, value: SiteSettings[K][F]) {
    setSettings((prev) => ({
      ...prev,
      [group]: { ...prev[group], [field]: value },
    }));
  }

  // ── Event Handlers ───────────────────────────

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // file size check — ~2MB limit
    if (file.size > 2_097_152) {
      alert("Logo file too large. Maximum size is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // base64 data URL — preview + save-এ use হবে
      updateField("siteLogo", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings from backend on mount
  useEffect(() => {
    adminSettingsApi.getSettings()
      .then(({ data }) => {
        setSettings((prev) => ({
          ...prev,
          hostUrl: data.hostUrl || prev.hostUrl,
          siteStatus: (data.siteMode === "maintenance" ? "offline" : "online") as "online" | "offline",
          notice: data.notice || prev.notice,
          maintenance: { ...prev.maintenance, text: data.maintenanceText || prev.maintenance.text },
          siteLogo: data.siteLogo || null,
        }));
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    setSaving(true);
    adminSettingsApi.updateSettings({
      hostUrl: settings.hostUrl,
      siteMode: settings.siteStatus === "offline" ? "maintenance" : "production",
      notice: settings.notice,
      maintenanceText: settings.maintenance.text,
      siteLogo: settings.siteLogo ?? "",
    })
      .then(() => console.log("Settings saved"))
      .catch((err) => console.error("Failed to save settings:", err))
      .finally(() => setSaving(false));
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-[70vh] bg-c-bg-900 text-c-gray-200 p-3 md:p-6 rounded-[12px]">

      {/* ── Dark mode overrides for ReactQuill ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .quill-dark .ql-toolbar   { border-color: #2d3340; background: #151921; border-radius: 6px 6px 0 0; }
          .quill-dark .ql-container  { border-color: #2d3340; background: #151921; border-radius: 0 0 6px 6px; min-height: 200px; color: #e5e7eb; font-size: 0.875rem; }
          .quill-dark .ql-stroke    { stroke: #9ca3af; }
          .quill-dark .ql-fill      { fill: #9ca3af; }
          .quill-dark .ql-picker     { color: #9ca3af; }
          .quill-dark .ql-picker-options { background: #1c212b; border-color: #2d3340; }
          /* Make shadcn inputs/selects match the dark palette */
          .dark-field input, .dark-field textarea, .dark-field [role="combobox"] {
            background-color: #151921 !important;
            border-color: #2d3340 !important;
            color: #e5e7eb !important;
          }
          /* Scrollable tab bar — hide scrollbar visually but keep it functional */
          .tabs-scrollable { overflow-x: auto; scrollbar-width: none; }
          .tabs-scrollable::-webkit-scrollbar { display: none; }
        `,
      }} />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-c-gray-400 mt-1">
            Manage global configurations, site status, and content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset button — outlined style on dark bg */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-c-bg-400 bg-transparent text-c-gray-300 hover:bg-c-bg-700 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          {/* Save button — green accent */}
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-c-green-400 hover:bg-c-green-500 text-white shadow-lg shadow-c-green-tw-900/30"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation + Content ── */}
      <Tabs defaultValue="general">
        <div className="tabs-scrollable w-full mb-6">
          <TabsList className="inline-flex min-w-max gap-1 bg-c-bg-700 border border-c-bg-400 p-1 rounded-lg h-10">
            <TabsTrigger value="general"   className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><Globe className="w-3.5 h-3.5" />General</TabsTrigger>
            <TabsTrigger value="status"    className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><Power className="w-3.5 h-3.5" />Status & Logo</TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><Wrench className="w-3.5 h-3.5" />Maintenance</TabsTrigger>
            <TabsTrigger value="auth"      className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><ShieldCheck className="w-3.5 h-3.5" />Auth Info</TabsTrigger>
            <TabsTrigger value="topup"     className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><Coins className="w-3.5 h-3.5" />Top Up</TabsTrigger>
            <TabsTrigger value="notice"    className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><Bell className="w-3.5 h-3.5" />Notice</TabsTrigger>
            <TabsTrigger value="rules"     className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><FileText className="w-3.5 h-3.5" />Rules</TabsTrigger>
            <TabsTrigger value="terms"     className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><FileText className="w-3.5 h-3.5" />Terms & Conditions</TabsTrigger>
            <TabsTrigger value="privacy"   className="data-[state=active]:bg-c-green-400 data-[state=active]:text-white text-c-gray-400 hover:text-c-gray-200 rounded-md px-3 text-sm flex items-center gap-1.5 whitespace-nowrap"><FileText className="w-3.5 h-3.5" />Privacy Policy</TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════
            TAB: GENERAL
        ════════════════════════════════════ */}
        <TabsContent value="general">
          <DarkCard title="Host Configuration" description="Set the base URL for your application.">
            <div className="max-w-md space-y-2">
              <Label htmlFor="hostUrl" className="text-c-gray-300">Host URL</Label>
              <Input
                id="hostUrl"
                placeholder="https://example.com"
                value={settings.hostUrl}
                onChange={(e) => updateField("hostUrl", e.target.value)}
                className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 placeholder-gray-500 focus-visible:ring-c-green-400"
              />
            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: STATUS & LOGO
        ════════════════════════════════════ */}
        <TabsContent value="status" className="space-y-5">

          {/* Site status selector */}
          <DarkCard title="Website Status" description="Control whether your site is publicly accessible.">
            <div className="flex items-center gap-4 max-w-sm">
              {/* Animated dot indicator */}
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                settings.siteStatus === "online" ? "bg-c-green-tw-500 animate-pulse" : "bg-c-orange-500"
              }`} />

              <Select
                value={settings.siteStatus}
                onValueChange={(val) => updateField("siteStatus", val as "online" | "offline")}
              >
                <SelectTrigger className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus:ring-c-green-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-c-bg-700 border-c-bg-400  text-c-gray-200">
                  <SelectItem value="online" className="focus:bg-c-bg-400 hover:text-white!">Website is Online</SelectItem>
                  <SelectItem value="offline" className="focus:bg-c-bg-400 hover:text-white!">Website is Offline</SelectItem>
                </SelectContent>
              </Select>

              <Badge className={settings.siteStatus === "online"
                ? "bg-c-green-tw-500/20 text-c-green-tw-400 border border-c-green-tw-500/30"
                : "bg-c-orange-500/20 text-c-orange-400 border border-c-orange-500/30"
              }>
                {settings.siteStatus}
              </Badge>
            </div>
          </DarkCard>

          {/* Logo upload area */}
          <DarkCard title="Site Logo" description="Recommended format: PNG or SVG with transparent background.">
            <div className="border-2 border-dashed border-c-bg-400 rounded-lg p-10 flex flex-col items-center gap-4 text-center hover:border-c-bg-300 transition-colors">

              {settings.siteLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.siteLogo} alt="Site Logo" className="max-h-24 object-contain" />
              ) : (
                <ImageIcon className="w-12 h-12 text-c-gray-600" />
              )}

              <p className="text-sm text-c-gray-500">
                {settings.siteLogo ? "Logo uploaded successfully." : "No logo uploaded yet."}
              </p>

              {/* Hidden file input — triggered by the button below */}
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-c-bg-400 bg-transparent text-c-gray-300 hover:bg-c-bg-400 hover:text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {settings.siteLogo ? "Change Logo" : "Upload Logo"}
              </Button>
            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: MAINTENANCE
        ════════════════════════════════════ */}
        <TabsContent value="maintenance">
          <DarkCard title="Maintenance Mode" description="Text shown to users when the site is in maintenance mode.">
            <div className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="maintenanceText" className="text-c-gray-300">Maintenance Message</Label>
                <Textarea
                  id="maintenanceText"
                  placeholder="e.g. We'll be back shortly…"
                  value={settings.maintenance.text}
                  onChange={(e) => updateNestedField("maintenance", "text", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 placeholder-gray-500 focus-visible:ring-c-green-400"
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="maintenanceHours" className="text-c-gray-300">Estimated Duration (hours)</Label>
                <Input
                  id="maintenanceHours"
                  type="number"
                  min={1}
                  value={settings.maintenance.hours}
                  onChange={(e) => updateNestedField("maintenance", "hours", Number(e.target.value))}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400"
                />
              </div>

            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: AUTH INFO
        ════════════════════════════════════ */}
        <TabsContent value="auth">
          <DarkCard title="Authentication Page Text" description="Customize the copy shown on login, register, and password reset pages.">
            <div className="grid gap-5 sm:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="copyrightText" className="text-c-gray-300">Copyright Text</Label>
                <Input id="copyrightText" value={settings.authInfo.copyrightText}
                  onChange={(e) => updateNestedField("authInfo", "copyrightText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeUrl" className="text-c-gray-300">Home URL</Label>
                <Input id="homeUrl" placeholder="https://example.com" value={settings.authInfo.homeUrl}
                  onChange={(e) => updateNestedField("authInfo", "homeUrl", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </div>

              <div className="sm:col-span-2"><Separator className="bg-c-bg-400" /></div>

              <div className="space-y-2">
                <Label htmlFor="signInText" className="text-c-gray-300">Sign In Subtitle</Label>
                <Input id="signInText" value={settings.authInfo.signInText}
                  onChange={(e) => updateNestedField("authInfo", "signInText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signUpText" className="text-c-gray-300">Sign Up Subtitle</Label>
                <Input id="signUpText" value={settings.authInfo.signUpText}
                  onChange={(e) => updateNestedField("authInfo", "signUpText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="passwordResetText" className="text-c-gray-300">Password Reset Text</Label>
                <Input id="passwordResetText" value={settings.authInfo.passwordResetText}
                  onChange={(e) => updateNestedField("authInfo", "passwordResetText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </div>

            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: TOP UP
        ════════════════════════════════════ */}
        <TabsContent value="topup">
          <DarkCard title="Top Up Settings" description="Text and instructions shown on the payment/top-up screen.">
            <div className="space-y-5">

              <DarkField label="BTC / ETH / LTC Instruction" htmlFor="cryptoText">
                <Input id="cryptoText" value={settings.topUp.cryptoText}
                  onChange={(e) => updateNestedField("topUp", "cryptoText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </DarkField>

              <DarkField label="Blank Currency Text" htmlFor="blankCurrencyText">
                <Input id="blankCurrencyText" value={settings.topUp.blankCurrencyText}
                  onChange={(e) => updateNestedField("topUp", "blankCurrencyText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </DarkField>

              <DarkField
                label="Generated Currency Text"
                htmlFor="generatedCurrencyText"
              >
                <Input id="generatedCurrencyText" value={settings.topUp.generatedCurrencyText}
                  onChange={(e) => updateNestedField("topUp", "generatedCurrencyText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </DarkField>

              <DarkField label="Caution / Support Text" htmlFor="cautionText">
                <Input id="cautionText" value={settings.topUp.cautionText}
                  onChange={(e) => updateNestedField("topUp", "cautionText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </DarkField>

              <DarkField label="Pop-Up Banner Text" htmlFor="popUpText">
                <Textarea id="popUpText" rows={4} value={settings.topUp.popUpText}
                  onChange={(e) => updateNestedField("topUp", "popUpText", e.target.value)}
                  className="bg-c-bg-800 border-c-bg-400 text-c-gray-200 focus-visible:ring-c-green-400" />
              </DarkField>

            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: NOTICE (Rich Text)
        ════════════════════════════════════ */}
        <TabsContent value="notice">
          <DarkCard title="Global Notice" description="Shown to all users on the dashboard. Supports rich text formatting.">
            <div className="quill-dark">
              <ReactQuill theme="snow" value={settings.notice} onChange={(v) => updateField("notice", v)} />
            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: RULES (Rich Text)
        ════════════════════════════════════ */}
        <TabsContent value="rules">
          <DarkCard title="Rules & Regulations" description="Platform rules shown to users. Supports rich text formatting.">
            <div className="quill-dark">
              <ReactQuill theme="snow" value={settings.rules} onChange={(v) => updateField("rules", v)} />
            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: TERMS & CONDITIONS (Rich Text)
        ════════════════════════════════════ */}
        <TabsContent value="terms">
          <DarkCard title="Terms & Conditions" description="Legal terms shown to users. Supports rich text formatting.">
            <div className="quill-dark">
              <ReactQuill theme="snow" value={settings.termsAndConditions} onChange={(v) => updateField("termsAndConditions", v)} />
            </div>
          </DarkCard>
        </TabsContent>

        {/* ════════════════════════════════════
            TAB: PRIVACY POLICY (Rich Text)
        ════════════════════════════════════ */}
        <TabsContent value="privacy">
          <DarkCard title="Privacy Policy" description="Privacy policy shown to users. Supports rich text formatting.">
            <div className="quill-dark">
              <ReactQuill theme="snow" value={settings.privacyPolicy} onChange={(v) => updateField("privacyPolicy", v)} />
            </div>
          </DarkCard>
        </TabsContent>

      </Tabs>
    </div>
  );
}

/** A dark-styled card with a title and optional description */
function DarkCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-c-bg-700 border-c-bg-400 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-base">{title}</CardTitle>
        {description && <CardDescription className="text-c-gray-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A label + optional hint text + input wrapper used in the Top Up tab */
function DarkField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-c-gray-300">
        {label}
        {hint && <span className="ml-2 text-xs text-c-gray-500 font-normal">— {hint}</span>}
      </Label>
      {children}
    </div>
  );
}