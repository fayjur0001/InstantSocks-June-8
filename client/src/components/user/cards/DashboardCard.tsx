import { DashboardCardData } from "@/types/user/dashboard";

interface DashboardCardProps {
  card: DashboardCardData;
}

export function DashboardCard({ card }: DashboardCardProps) {
  return (
    <div className="border-none bg-black shadow-md flex flex-col justify-between p-3 rounded-[16px]">
      <div className="pb-2">
        <p className="text-16-medium-inter text-white">
          {card.title}
        </p>
        <h5 className="text-24-medium-inter text-white">
          {card.subtitle}
        </h5>
      </div>

      <div className="flex-grow flex items-end justify-end">
        {card.type === "metric" ? (
          <span className={`text-36-regular-inter ${card.valueColorClass}`}>
            {card.value}
          </span>
        ) : (
          <div className="w-full flex flex-col gap-2 mt-3 text-sm">
            {card.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between w-full"
              >
                <span className="text-c-green-400">{item.name}</span>
                <span className="text-c-gray-300">{item.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}