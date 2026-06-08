export interface ExpiringService {
  id: string;
  name: string;
  date: string;
}

export interface BaseCardData {
  id: string;
  title: string;
  subtitle: string;
  type: "metric" | "list";
}

export interface MetricCardData extends BaseCardData {
  type: "metric";
  value: string;
  valueColorClass: string;
}

export interface ListCardData extends BaseCardData {
  type: "list";
  items: ExpiringService[];
}

export type DashboardCardData = MetricCardData | ListCardData;