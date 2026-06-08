"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Types & Interfaces ---

export interface Notice {
  id: string;
  text: string;
}

interface InfoTabsProps {
  notices: Notice[];
}

// --- Mock Data (can be passed as props) ---

const notices: Notice[] = [
  {
    id: "1",
    text: "Long Term MDN Rental Expansions. New LTR numbers are being added to increase capacity. Numbers being added daily for high demand service availability.",
  },
  {
    id: "2",
    text: "Bulk US Mobile Number Orders Use this feature to submit an offer for a bulk quantity of US mobile phone numbers for a specific service at your desired pricing (certain limits apply). If your offer is approved, you will be guaranteed to receive those numbers at the price you offered.",
  },
  {
    id: "3",
    text: "Bulk US Mobile Number Orders Use this feature to submit an offer for a bulk quantity of US mobile phone numbers for a specific service at your desired pricing (certain limits apply). If your offer is approved, you will be guaranteed to receive those numbers at the price you offered.",
  },
  {
    id: "4",
    text: "Bulk US Mobile Number Orders Use this feature to submit an offer for a bulk quantity of US mobile phone numbers for a specific service at your desired pricing (certain limits apply). If your offer is approved, you will be guaranteed to receive those numbers at the price you offered.",
  },
  {
    id: "5",
    text: "Bulk US Mobile Number Orders Use this feature to submit an offer for a bulk quantity of US mobile phone numbers for a specific service at your desired pricing (certain limits apply). If your offer is approved, you will be guaranteed to receive those numbers at the price you offered.",
  },
];

// --- Sub-components ---

const SectionHeader = () => (
  <div className="flex items-center justify-center gap-4 mb-8 pt-4">
    <div className="h-[1px] w-12 bg-c-emerald-500/30"></div>
    <h2 className="text-c-slate-300 text-sm font-semibold tracking-wide flex items-center gap-2">
      Official Notice
      {/* Curved Arrow SVG matching the design */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-c-slate-400"
      >
        <path d="M9 10h5a4 4 0 0 1 4 4v6" />
        <path d="m22 16-4 4-4-4" />
      </svg>
    </h2>
    <div className="h-[1px] w-4 bg-c-emerald-500/30"></div>
  </div>
);

// --- Main Component ---

export default function InfoTabs() {
  return (
    <div className="w-full mt-2 lg:mt-4">
      <Tabs defaultValue="notices" className="w-full">
        
        {/* Tab Navigation */}
        <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2.5 lg:gap-5 justify-start">
          <TabsTrigger
            value="notices"
          >
            Notices
          </TabsTrigger>
          <TabsTrigger
            value="rules"
          >
            Rules & Regulations
          </TabsTrigger>
          <TabsTrigger
            value="terms"
         >
            Terms & Condition
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
         >
            Privacy Policy
          </TabsTrigger>
        </TabsList>

        {/* Tab Content - Notices */}
        <TabsContent value="notices" className="mt-0 outline-none">
          <div className="bg-black border border-c-emerald-900/20 rounded-xl overflow-hidden flex h-[500px]">
            <div className="flex-1 flex flex-col p-6">
              <SectionHeader />

              {/* Scrollable Content Area with Custom Scrollbar */}
              <div 
                className="flex-1 overflow-y-auto pr-4 space-y-6 
                  [&::-webkit-scrollbar]:w-1.5
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-c-green-500
                  [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {notices.map((notice, index) => (
                  <React.Fragment key={notice.id}>
                    <div className="text-c-slate-300 text-sm leading-relaxed">
                      {notice.text}
                    </div>
                    {/* Divider, hide on the last item */}
                    {index < notices.length - 1 && (
                      <div className="h-[1px] w-full bg-c-emerald-900/20 my-6"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </TabsContent>

        {/* Empty states for other tabs */}
        <TabsContent value="rules">
           <div className="bg-black border border-c-emerald-900/20 rounded-xl p-8 text-c-slate-400">Rules content goes here...</div>
        </TabsContent>
        <TabsContent value="terms">
           <div className="bg-black border border-c-emerald-900/20 rounded-xl p-8 text-c-slate-400">Terms content goes here...</div>
        </TabsContent>
        <TabsContent value="privacy">
           <div className="bg-black border border-c-emerald-900/20 rounded-xl p-8 text-c-slate-400">Privacy content goes here...</div>
        </TabsContent>

      </Tabs>
    </div>
  );
}