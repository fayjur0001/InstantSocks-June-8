"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { publicApi, PublicContentData } from "@/lib/api";



export interface Notice {
  id: string;
  text: string;
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
  <div className="bg-black border border-c-emerald-900/20 rounded-xl overflow-hidden flex h-[500px]">
    <div className="flex-1 flex flex-col p-6">
      <SectionHeader title={title} />
      <div
        className="rich-html flex-1 overflow-y-auto pr-4
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-c-green-500
          [&::-webkit-scrollbar-thumb]:rounded-full"
        dangerouslySetInnerHTML={{ __html: html || "<p>No content available.</p>" }}
      />
    </div>
  </div>
);



export default function InfoTabs() {
  const [content, setContent] = useState<PublicContentData>({
    notice: "",
    rules: "",
    termsAndConditions: "",
    privacyPolicy: "",
  });

  useEffect(() => {
    publicApi
      .getContent()
      .then(({ data }) => setContent(data))
      .catch((err) => console.error("Failed to load dashboard content:", err));
  }, []);

  return (
    <div className="w-full mt-2 lg:mt-4">

      {}
      <style>{`
        .rich-html { color: #cbd5e1; font-size: 0.875rem; line-height: 1.6; }
        .rich-html p { margin-bottom: 0.75rem; }
        .rich-html p:last-child { margin-bottom: 0; }
        .rich-html strong, .rich-html b { font-weight: 600; color: #f1f5f9; }
        .rich-html em, .rich-html i { font-style: italic; }
        .rich-html u { text-decoration: underline; }
        .rich-html s { text-decoration: line-through; }
        .rich-html h1 { font-size: 1.5rem;  font-weight: 700; color: #f1f5f9; margin-bottom: 0.75rem; }
        .rich-html h2 { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.5rem; }
        .rich-html h3 { font-size: 1.1rem;  font-weight: 600; color: #e2e8f0; margin-bottom: 0.5rem; }
        .rich-html ul { list-style-type: disc;    padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .rich-html ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .rich-html li { margin-bottom: 0.25rem; }
        .rich-html a  { color: #4ade80; text-decoration: underline; }
        .rich-html blockquote { border-left: 2px solid rgba(16,185,129,0.4); padding-left: 1rem; color: #94a3b8; font-style: italic; margin-bottom: 0.75rem; }
      `}</style>

      <Tabs defaultValue="notices" className="w-full">

        {}
        <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2.5 lg:gap-5 justify-start">
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="rules">Rules & Regulations</TabsTrigger>
          <TabsTrigger value="terms">Terms & Condition</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="notices" className="mt-0 outline-none">
          <RichContent html={content.notice} title="Official Notice" />
        </TabsContent>

        <TabsContent value="rules">
          <RichContent html={content.rules} title="Rules & Regulations" />
        </TabsContent>

        <TabsContent value="terms">
          <RichContent html={content.termsAndConditions} title="Terms & Conditions" />
        </TabsContent>

        <TabsContent value="privacy">
          <RichContent html={content.privacyPolicy} title="Privacy Policy" />
        </TabsContent>

      </Tabs>
    </div>
  );
}