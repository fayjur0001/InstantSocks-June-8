import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const Wallete = () => {
  const { balance } = useAuth();

  return (
    <div className="hidden h-11 w-fit items-center gap-3 rounded-[8px] border border-white/10 bg-white/5 px-2.5 py-1 lg:flex">
      {/* Wallet Icon and Balance */}
      <div className="flex items-center gap-1.5">
        <Wallet className="h-3.75 w-3.75 text-white/80" strokeWidth={2.5} />
        <span className="text-[14px] leading-none font-medium text-white">
          ${Number(balance ?? 0).toFixed(2)}
        </span>
      </div>

      {/* Deposit Action */}
      <Link href={"/admin/deposit"}>
        <Button
          variant="ghost"
          className="h-6.5 border border-white/10 px-2 text-[12px]! text-c-green-500 font-semibold text-lg hover:bg-white/10 hover:text-c-green-300"
        >
          Deposit
        </Button>
      </Link>
    </div>
  );
};

export default Wallete;