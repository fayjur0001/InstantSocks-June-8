"use client";
 
import ProxyTable from "./ProxyTable";
import StatisticsArea from "./StatisticsArea";
 
export default function ProxyTabContent() {
  return (
    <div className="space-y-6">
      <StatisticsArea tabContext="proxy" />
      <div className="bg-c-bg-750 border border-c-slate-800 rounded-xl p-5">
        <ProxyTable />
      </div>
    </div>
  );
}