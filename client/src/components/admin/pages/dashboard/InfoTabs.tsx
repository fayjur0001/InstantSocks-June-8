"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "react-quill-new/dist/quill.snow.css";



interface InfoTabsProps {
  notice:             string;
  rules:              string;
  termsAndConditions: string;
  privacyPolicy:      string;
}



const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center gap-4 mb-8 pt-4">
    <div className="h-[1px] w-12 bg-c-emerald-500/30"></div>
    <h2 className="text-c-slate-300 text-sm font-semibold tracking-wide flex items-center gap-2">
      {title}
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

const RichContent = ({ html, title }: { html: string; title: string }) => (
  <div className="bg-black border border-c-emerald-900/20 rounded-xl overflow-hidden flex min-h-[200px] max-h-[500px]">
    <div className="flex-1 flex flex-col p-6">
      <SectionHeader title={title} />
      {}
      <div
        className="
          ql-editor
          flex-1 overflow-y-auto
          !p-0
          text-c-slate-300 text-sm
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-c-green-500
          [&::-webkit-scrollbar-thumb]:rounded-full
        "
        dangerouslySetInnerHTML={{ __html: html || "<p>No content available.</p>" }}
      />
    </div>
  </div>
);



export default function InfoTabs({
  notice,
  rules,
  termsAndConditions,
  privacyPolicy,
}: InfoTabsProps) {
  return (
    <div className="w-full mt-2 lg:mt-4">
      <Tabs defaultValue="notices" className="w-full">

        <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2.5 lg:gap-5 justify-start">
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="rules">Rules & Regulations</TabsTrigger>
          <TabsTrigger value="terms">Terms & Condition</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="notices" className="mt-0 outline-none">
          <RichContent html={notice} title="Official Notice" />
        </TabsContent>

        <TabsContent value="rules">
          <RichContent html={rules} title="Rules & Regulations" />
        </TabsContent>

        <TabsContent value="terms">
          <RichContent html={termsAndConditions} title="Terms & Conditions" />
        </TabsContent>

        <TabsContent value="privacy">
          <RichContent html={privacyPolicy} title="Privacy Policy" />
        </TabsContent>

      </Tabs>
    </div>
  );
}