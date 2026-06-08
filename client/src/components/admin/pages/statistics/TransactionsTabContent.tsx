"use client";
 
import TransactionsTable from "../transactions/TransactionsTable";
import StatisticsArea from "./StatisticsArea";
 
export default function TransactionsTabContent() {
  return (
    <div className="space-y-6">
      <StatisticsArea tabContext="transactions" />
      <TransactionsTable showDelete={true} maxItems={5} />
    </div>
  );
}